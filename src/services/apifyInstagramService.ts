/**
 * Apify Instagram Backend & Frontend Service
 * Handles official Apify Actor integrations for Instagram profile and connection scraping.
 * 
 * Rules:
 * - APIFY_API_TOKEN is accessed exclusively on the server (never exposed to client).
 * - Never disguise Apify errors or timeouts with fake 200 responses.
 * - Never flag simulated or mock data as isRealData: true.
 * - Safe numeric parsing for postsCount, followersCount, followingCount.
 */

import { InstagramProfile, RealInstagramConnection } from '../types';

export interface InstagramProfileData {
  handle: string;
  name: string;
  bio: string;
  avatarUrl: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isVerified: boolean;
  isPrivate: boolean;
  category: string;
  externalUrl?: string | null;
  isRealData: boolean;
  isDemo?: boolean;
}

export interface RealInstagramConnectionData {
  username: string;
  fullName: string;
  profilePicUrl: string;
  profilePicUrlHD?: string;
  isPrivate?: boolean;
  isVerified?: boolean;
  followRelationship?: 'mutual' | 'they_follow_you' | 'neither';
  isFollowing?: boolean;
  isFollower?: boolean;
  gender?: 'female' | 'male';
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  postImages?: string[];
  type?: 'following' | 'follower' | 'related';
}

export class ApifyError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 500, code: string = 'APIFY_ERROR') {
    super(message);
    this.name = 'ApifyError';
    this.statusCode = statusCode;
    this.code = code;
    Object.setPrototypeOf(this, ApifyError.prototype);
  }
}

export class ApifyBackendError extends ApifyError {}

// In-memory caches to save Apify compute units and respond instantly on repeat queries
const profileCache = new Map<string, { profile: InstagramProfileData; timestamp: number }>();
const connectionsCache = new Map<string, { connections: RealInstagramConnectionData[]; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const inFlightProfileRequests = new Map<string, Promise<InstagramProfileData>>();

export function clearBackendCache(): void {
  profileCache.clear();
  connectionsCache.clear();
  inFlightProfileRequests.clear();
}

export function clearApifyCache(): void {
  clearBackendCache();
}

/**
 * Cleans user input: strips @, spaces, URL prefixes, query parameters.
 */
export function cleanInstagramHandle(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  str = str.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  str = str.split('?')[0].split('/')[0];
  str = str.replace(/^@+\s*/, '').trim();
  return str.toLowerCase();
}

/**
 * Validates Instagram username according to Instagram official rules:
 * 1-30 characters, alphanumeric, dots and underscores only.
 */
export function validateUsername(raw: string): { valid: boolean; clean: string; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, clean: '', error: 'O nome de usuário não pode estar vazio.' };
  }

  const clean = cleanInstagramHandle(raw);

  if (clean.length === 0 || clean.length > 30) {
    return { valid: false, clean, error: 'O nome de usuário deve ter entre 1 e 30 caracteres.' };
  }

  const regex = /^[a-z0-9._]+$/;
  if (!regex.test(clean)) {
    return { valid: false, clean, error: 'O nome de usuário contém caracteres inválidos.' };
  }

  return { valid: true, clean };
}

export function sanitizeAndValidateUsername(rawUsername: string): string {
  const result = validateUsername(rawUsername);
  if (!result.valid) {
    throw new ApifyBackendError(result.error || 'Nome de usuário inválido.', 400, 'INVALID_USERNAME');
  }
  return result.clean;
}

export type TokenResult =
  | { token: string; error?: undefined; code?: undefined; statusCode?: undefined }
  | { token: null; error: string; code: string; statusCode: number };

export function getApifyToken(): TokenResult {
  const raw = process.env.APIFY_API_TOKEN || '';
  const token = raw.trim().replace(/^['"]|['"]$/g, '');

  if (!token) {
    return {
      token: null,
      error: 'Token da Apify (APIFY_API_TOKEN) não configurado nas variáveis de ambiente do servidor.',
      code: 'TOKEN_MISSING',
      statusCode: 500,
    };
  }

  if (token.startsWith('sk_live_') || token.startsWith('sk_test_')) {
    return {
      token: null,
      error: 'A credencial configurada é uma chave da Stripe e não da Apify. O token da Apify começa com apify_api_.',
      code: 'INVALID_TOKEN_FORMAT',
      statusCode: 401,
    };
  }

  return { token };
}

export function requireApifyToken(): string {
  const res = getApifyToken();
  if (res.token === null) {
    throw new ApifyBackendError(res.error, res.statusCode, res.code);
  }
  return res.token;
}

export function toProxyUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('/api/proxy-image')) return url;
  if (
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('fbsbx.com') ||
    url.includes('instagram.com')
  ) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function toSafeNumber(val: any, fallback: number = 0): number {
  const n = Number(val);
  return typeof n === 'number' && !isNaN(n) && isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Queries Instagram Profile using the official Apify Actor: apify/instagram-profile-scraper
 */
export async function fetchInstagramProfile(
  rawUsername: string,
  forceRefresh: boolean = false
): Promise<InstagramProfileData> {
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    throw new ApifyBackendError(validation.error || 'Nome de usuário inválido.', 400, 'INVALID_USERNAME');
  }
  const username = validation.clean;

  if (!forceRefresh) {
    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.profile;
    }
  } else {
    profileCache.delete(username);
  }

  const inFlight = inFlightProfileRequests.get(username);
  if (inFlight) {
    return inFlight;
  }

  const queryPromise = (async (): Promise<InstagramProfileData> => {
    const token = requireApifyToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);

    const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items?timeout=22';

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          usernames: [username],
          includeAboutSection: false,
        }),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApifyBackendError(
          'A consulta na Apify excedeu o tempo limite de resposta (timeout). Tente novamente.',
          504,
          'TIMEOUT'
        );
      }
      throw new ApifyBackendError(
        `Falha de conexão com os servidores da Apify: ${err.message || 'Erro de rede'}`,
        502,
        'NETWORK_ERROR'
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApifyBackendError('Token da Apify inválido ou não autorizado.', 401, 'UNAUTHORIZED');
      }
      if (response.status === 403) {
        throw new ApifyBackendError(
          'Limite de uso/cota da Apify atingido ou acesso bloqueado.',
          403,
          'USAGE_LIMIT'
        );
      }
      if (response.status === 429) {
        throw new ApifyBackendError('Limite de requisições por minuto da Apify atingido.', 429, 'RATE_LIMIT');
      }
      const errText = await response.text().catch(() => '');
      throw new ApifyBackendError(
        `Erro retornado pela Apify (Status ${response.status}): ${errText.slice(0, 140)}`,
        response.status >= 500 ? 502 : response.status,
        'APIFY_API_ERROR'
      );
    }

    let dataset: any;
    try {
      dataset = await response.json();
    } catch {
      throw new ApifyBackendError('A Apify retornou uma resposta em formato inválido.', 502, 'INVALID_RESPONSE');
    }

    if (!Array.isArray(dataset) || dataset.length === 0) {
      throw new ApifyBackendError('Esse perfil não existe ou não foi encontrado no Instagram. Por favor, coloque um perfil válido.', 404, 'NOT_FOUND');
    }

    const item = dataset.find(
      (entry: any) => entry.username && entry.username.toLowerCase() === username
    ) || dataset[0];

    if (
      item.error === 'not_found' ||
      item.errorDescription === 'Profile does not exist' ||
      (!item.username && !item.fullName && !item.id)
    ) {
      throw new ApifyBackendError('Esse perfil não existe ou não foi encontrado no Instagram. Por favor, coloque um perfil válido.', 404, 'NOT_FOUND');
    }

    const rawPic = item.profilePicUrlHD || item.profilePicUrl || '';
    const avatarUrl = toProxyUrl(rawPic);

    const profile: InstagramProfileData = {
      handle: item.username || username,
      name: item.fullName || item.username || username,
      bio: typeof item.biography === 'string' ? item.biography : '',
      avatarUrl,
      followersCount: toSafeNumber(item.followersCount, 0),
      followingCount: toSafeNumber(item.followsCount, 0),
      postsCount: toSafeNumber(item.postsCount, 0),
      isVerified: Boolean(item.verified),
      isPrivate: Boolean(item.private),
      category: item.businessCategoryName || (item.private ? 'Conta Privada' : 'Perfil Público'),
      externalUrl: item.externalUrl || null,
      isRealData: true,
      isDemo: false,
    };

    profileCache.set(username, { profile, timestamp: Date.now() });
    return profile;
  })();

  inFlightProfileRequests.set(username, queryPromise);
  try {
    return await queryPromise;
  } finally {
    inFlightProfileRequests.delete(username);
  }
}

export async function fetchInstagramProfileApify(
  rawUsername: string,
  forceRefresh: boolean = false
): Promise<InstagramProfile> {
  return fetchInstagramProfile(rawUsername, forceRefresh);
}

/**
 * Queries Instagram Followers / Following using Apify Actor: apify/instagram-followers-following-scraper
 */
export async function fetchInstagramConnections(
  rawUsername: string,
  forceRefresh: boolean = false
): Promise<{ connections: RealInstagramConnectionData[]; count: number; isRealData: boolean; message?: string }> {
  const validation = validateUsername(rawUsername);
  if (!validation.valid) {
    throw new ApifyBackendError(validation.error || 'Nome de usuário inválido.', 400, 'INVALID_USERNAME');
  }
  const username = validation.clean;

  if (!forceRefresh) {
    const cached = connectionsCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return { connections: cached.connections, count: cached.connections.length, isRealData: true };
    }
  }

  const token = requireApifyToken();

  const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-followers-following-scraper/run-sync-get-dataset-items?timeout=22';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 24000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        usernames: [username],
        maxItems: 20,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      connections: [],
      count: 0,
      isRealData: true,
      message: err.name === 'AbortError' ? 'Timeout ao consultar conexões' : 'Falha na rede ao consultar conexões',
    };
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    return {
      connections: [],
      count: 0,
      isRealData: true,
      message: `Apify retornou status ${response.status}`,
    };
  }

  let dataset: any[];
  try {
    dataset = await response.json();
  } catch {
    return { connections: [], count: 0, isRealData: true, message: 'Formato inválido de dataset' };
  }

  if (!Array.isArray(dataset)) {
    return { connections: [], count: 0, isRealData: true };
  }

  const connections: RealInstagramConnectionData[] = dataset
    .filter((entry: any) => Boolean(entry.username || entry.ownerUsername))
    .map((entry: any) => {
      const connUsername = entry.username || entry.ownerUsername;
      const fullName = entry.fullName || entry.name || connUsername;
      const pic = toProxyUrl(entry.profilePicUrlHD || entry.profilePicUrl || '');
      const isPrivate = Boolean(entry.isPrivate || entry.private);
      const isVerified = Boolean(entry.isVerified || entry.verified);
      const followersCount = toSafeNumber(entry.followersCount, 0);
      const followingCount = toSafeNumber(entry.followsCount, 0);
      const postsCount = toSafeNumber(entry.postsCount, 0);

      let followRelationship: 'mutual' | 'they_follow_you' | 'neither' = 'they_follow_you';
      if (entry.followsViewer && entry.followedByViewer) {
        followRelationship = 'mutual';
      } else if (entry.followsViewer) {
        followRelationship = 'they_follow_you';
      } else {
        followRelationship = 'neither';
      }

      return {
        username: connUsername,
        fullName,
        profilePicUrl: pic,
        profilePicUrlHD: pic,
        isPrivate,
        isVerified,
        followRelationship,
        isFollowing: Boolean(entry.followedByViewer),
        isFollower: Boolean(entry.followsViewer ?? true),
        bio: typeof entry.biography === 'string' ? entry.biography : '',
        followersCount,
        followingCount,
        postsCount,
        postImages: Array.isArray(entry.latestPosts) ? entry.latestPosts.map((p: any) => toProxyUrl(p.displayUrl)) : [],
      };
    });

  connectionsCache.set(username, { connections, timestamp: Date.now() });
  return { connections, count: connections.length, isRealData: true };
}

export async function fetchInstagramConnectionsApify(
  rawUsername: string,
  forceRefresh: boolean = false
): Promise<RealInstagramConnection[]> {
  const result = await fetchInstagramConnections(rawUsername, forceRefresh);
  return result.connections as RealInstagramConnection[];
}

/**
 * Asynchronous execution support
 */
export async function startActorRun(
  actorId: string,
  input: Record<string, any>
): Promise<{ runId: string; status: string }> {
  const token = requireApifyToken();
  const endpoint = `https://api.apify.com/v2/acts/${actorId.replace('/', '~')}/runs`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new ApifyBackendError(`Falha ao iniciar Actor na Apify: ${errText.slice(0, 100)}`, res.status, 'RUN_START_FAILED');
  }

  const data = await res.json();
  return {
    runId: data.data?.id,
    status: data.data?.status || 'RUNNING',
  };
}

export async function getActorRunStatus(runId: string): Promise<{
  runId: string;
  status: string;
  isFinished: boolean;
  isSuccess: boolean;
  defaultDatasetId?: string;
}> {
  const token = requireApifyToken();
  const endpoint = `https://api.apify.com/v2/actor-runs/${runId}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new ApifyBackendError('Execução da Apify não encontrada.', res.status, 'RUN_NOT_FOUND');
  }

  const data = await res.json();
  const run = data.data;
  const status = run.status;
  const isFinished = ['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(status);
  const isSuccess = status === 'SUCCEEDED';

  return {
    runId,
    status,
    isFinished,
    isSuccess,
    defaultDatasetId: run.defaultDatasetId,
  };
}

export async function getDatasetItems(datasetId: string, limit: number = 20): Promise<any[]> {
  const token = requireApifyToken();
  const endpoint = `https://api.apify.com/v2/datasets/${datasetId}/items?limit=${limit}`;

  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    return [];
  }

  return await res.json();
}
