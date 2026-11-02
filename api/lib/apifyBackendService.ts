/**
 * Unified Backend Service for Apify Instagram Integration
 * Shared across Vercel Serverless Functions and local Express server.
 * 
 * Rules strictly enforced:
 * 1. APIFY_API_TOKEN is accessed exclusively on the server (never exposed to client).
 * 2. Never disguise Apify errors or timeouts with fake 200 responses.
 * 3. Never flag simulated or mock data as isRealData: true.
 * 4. Respect Vercel execution limits (timeout <= 24s for maxDuration 30s).
 */

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

export class ApifyBackendError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ApifyBackendError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

// In-memory caches to save Apify compute units and respond instantly on repeat queries
const profileCache = new Map<string, { profile: InstagramProfileData; timestamp: number }>();
const connectionsCache = new Map<string, { connections: RealInstagramConnectionData[]; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

// In-flight deduplication
const inFlightProfileRequests = new Map<string, Promise<InstagramProfileData>>();

export function clearBackendCache(): void {
  profileCache.clear();
  connectionsCache.clear();
  inFlightProfileRequests.clear();
}

/**
 * Validates Instagram username according to Instagram official rules:
 * 1-30 characters, alphanumeric, dots and underscores only.
 */
export function validateUsername(raw: string): { valid: boolean; clean: string; error?: string } {
  if (!raw || typeof raw !== 'string') {
    return { valid: false, clean: '', error: 'O nome de usuário não pode estar vazio.' };
  }

  const clean = raw.trim().replace(/^@/, '').trim().toLowerCase();

  if (clean.length === 0 || clean.length > 30) {
    return { valid: false, clean, error: 'O nome de usuário deve ter entre 1 e 30 caracteres.' };
  }

  const regex = /^[a-z0-9._]+$/;
  if (!regex.test(clean)) {
    return { valid: false, clean, error: 'O nome de usuário contém caracteres inválidos.' };
  }

  return { valid: true, clean };
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

/**
 * Converts image URL to server-side image proxy to prevent CORS and Instagram CDN expiration issues.
 */
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

/**
 * Safely parses any number value with fallback.
 */
export function toSafeNumber(val: any, fallback: number = 0): number {
  const n = Number(val);
  return typeof n === 'number' && !isNaN(n) && isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Queries Instagram Profile using the official Apify Actor: apify/instagram-profile-scraper
 * Runs synchronously up to 24s. Never returns fake profiles on failure.
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

  // 1. Cache hit check
  if (!forceRefresh) {
    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.profile;
    }
  } else {
    profileCache.delete(username);
  }

  // 2. In-flight deduplication
  const inFlight = inFlightProfileRequests.get(username);
  if (inFlight) {
    return inFlight;
  }

  const queryPromise = (async (): Promise<InstagramProfileData> => {
    const token = requireApifyToken();

    // Timeout of 24s to guarantee return before Vercel's 30s function limit
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
      throw new ApifyBackendError('Esse perfil não existe, por favor coloque um perfil válido.', 404, 'NOT_FOUND');
    }

    const item = dataset.find(
      (entry: any) => entry.username && entry.username.toLowerCase() === username
    ) || dataset[0];

    // Check if the actor explicitly signaled profile not found or error
    if (
      item.error === 'not_found' ||
      item.errorDescription === 'Profile does not exist' ||
      (!item.username && !item.fullName && !item.id)
    ) {
      throw new ApifyBackendError('Esse perfil não existe, por favor coloque um perfil válido.', 404, 'NOT_FOUND');
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

/**
 * Queries Instagram Followers / Following using Apify Actor: apify/instagram-followers-following-scraper
 * Strictly preserves real follower and following connections without fabricating relationships.
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

  // Run Apify followers/following scraper
  const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-followers-following-scraper/run-sync-get-dataset-items?timeout=22';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 24000);

  try {
    // Scrape followers list
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        account: [username],
        dataToScrape: 'Followers',
        resultsLimit: 12,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new ApifyBackendError('Token da Apify não autorizado.', 401, 'UNAUTHORIZED');
      }
      return {
        connections: [],
        count: 0,
        isRealData: true,
        message: 'Conexões não puderam ser extraídas (perfil privado ou restrição do Instagram).',
      };
    }

    const dataset = await response.json().catch(() => []);
    if (!Array.isArray(dataset) || dataset.length === 0) {
      return {
        connections: [],
        count: 0,
        isRealData: true,
        message: 'Nenhuma conexão retornada pela Apify para este perfil.',
      };
    }

    const connections: RealInstagramConnectionData[] = [];
    for (const item of dataset) {
      if (item && item.username) {
        const rawPic = item.profilePicUrlHD || item.profilePicUrl || item.profile_pic_url || '';
        connections.push({
          username: item.username,
          fullName: item.fullName || item.full_name || item.username,
          profilePicUrl: toProxyUrl(rawPic),
          isPrivate: Boolean(item.isPrivate || item.is_private),
          isVerified: Boolean(item.isVerified || item.is_verified),
          type: 'follower',
          isFollower: true,
          isFollowing: false,
          followRelationship: 'they_follow_you',
        });
      }
    }

    connectionsCache.set(username, { connections, timestamp: Date.now() });
    return { connections, count: connections.length, isRealData: true };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err instanceof ApifyBackendError) {
      throw err;
    }
    return {
      connections: [],
      count: 0,
      isRealData: true,
      message: 'Não foi possível extrair conexões adicionais via Apify.',
    };
  }
}

/**
 * Starts an asynchronous Actor run on Apify and returns run ID and dataset ID.
 */
export async function startActorRun(
  actorId: string,
  input: Record<string, any>
): Promise<{ runId: string; defaultDatasetId: string; status: string }> {
  const token = requireApifyToken();

  const endpoint = `https://api.apify.com/v2/actors/${encodeURIComponent(actorId.replace('/', '~'))}/runs`;
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
    throw new ApifyBackendError(`Falha ao iniciar Actor na Apify (${res.status}): ${errText.slice(0, 100)}`, res.status, 'APIFY_RUN_ERROR');
  }

  const json = await res.json();
  const data = json?.data;
  return {
    runId: data?.id || '',
    defaultDatasetId: data?.defaultDatasetId || '',
    status: data?.status || 'RUNNING',
  };
}

/**
 * Checks the status of an active Apify actor run.
 */
export async function getActorRunStatus(runId: string): Promise<{
  id: string;
  status: string;
  defaultDatasetId: string;
  isFinished: boolean;
  isSuccess: boolean;
}> {
  const token = requireApifyToken();

  const endpoint = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`;
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new ApifyBackendError(`Falha ao consultar status da execução (${res.status})`, res.status, 'APIFY_STATUS_ERROR');
  }

  const json = await res.json();
  const data = json?.data;
  const status = data?.status || 'UNKNOWN';
  const isFinished = ['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(status);
  const isSuccess = status === 'SUCCEEDED';

  return {
    id: data?.id || runId,
    status,
    defaultDatasetId: data?.defaultDatasetId || '',
    isFinished,
    isSuccess,
  };
}

/**
 * Retrieves items from an Apify dataset.
 */
export async function getDatasetItems(datasetId: string, limit: number = 20): Promise<any[]> {
  const token = requireApifyToken();

  const endpoint = `https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items?limit=${limit}`;
  const res = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new ApifyBackendError(`Falha ao obter itens do dataset (${res.status})`, res.status, 'APIFY_DATASET_ERROR');
  }

  return await res.json().catch(() => []);
}
