import { InstagramProfile } from '../types';

export class ApifyError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'ApifyError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

interface CacheEntry {
  profile: InstagramProfile;
  timestamp: number;
}

// In-memory cache (15 minutes TTL) to reduce API consumption and improve response speed
const profileCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

// In-flight request deduplication map
const inFlightRequests = new Map<string, Promise<InstagramProfile>>();

/**
 * Clears in-memory profile and in-flight request caches
 */
export function clearApifyCache(): void {
  profileCache.clear();
  inFlightRequests.clear();
}

/**
 * Sanitizes and validates an Instagram username.
 * Rules: 1-30 chars, alphanumeric + period + underscore.
 */
export function sanitizeAndValidateUsername(rawUsername: string): string {
  if (!rawUsername) {
    throw new ApifyError('O nome de usuário não pode estar vazio.', 400, 'INVALID_USERNAME');
  }

  const cleaned = rawUsername.trim().replace(/^@/, '').trim().toLowerCase();

  if (cleaned.length === 0 || cleaned.length > 30) {
    throw new ApifyError('O nome de usuário deve ter entre 1 e 30 caracteres.', 400, 'INVALID_USERNAME');
  }

  const usernameRegex = /^[a-z0-9._]+$/;
  if (!usernameRegex.test(cleaned)) {
    throw new ApifyError('O nome de usuário contém caracteres inválidos.', 400, 'INVALID_USERNAME');
  }

  return cleaned;
}

/**
 * Fetches an Instagram profile using the official Apify Actor: apify/instagram-profile-scraper
 */
export async function fetchInstagramProfileApify(rawUsername: string, forceRefresh = false): Promise<InstagramProfile> {
  const username = sanitizeAndValidateUsername(rawUsername);

  // 1. Check in-memory cache (unless forceRefresh is requested)
  if (!forceRefresh) {
    const cached = profileCache.get(username);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.profile;
    }
  } else {
    profileCache.delete(username);
  }

  // 2. Request deduplication (if another request for the same username is already executing)
  if (inFlightRequests.has(username)) {
    return inFlightRequests.get(username)!;
  }

  const executePromise = (async (): Promise<InstagramProfile> => {
    const rawToken = process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN || '';
    const apiToken = rawToken.trim().replace(/^['"]|['"]$/g, '');
    if (!apiToken) {
      throw new ApifyError(
        'Token da Apify (APIFY_API_TOKEN) não configurado no servidor.',
        500,
        'TOKEN_NOT_CONFIGURED'
      );
    }

    if (apiToken.startsWith('sk_live_') || apiToken.startsWith('sk_test_')) {
      throw new ApifyError(
        'O token informado (sk_live_...) é uma chave da Stripe e não da Apify. O token da Apify começa com apify_api_...',
        401,
        'INVALID_APIFY_TOKEN'
      );
    }

    const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items';

    // 40-second timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiToken.trim()}`,
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
        throw new ApifyError('A consulta à Apify excedeu o tempo limite (timeout).', 504, 'TIMEOUT');
      }
      throw new ApifyError(`Falha de conexão com a Apify: ${err.message || 'Erro de rede'}`, 502, 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeoutId);
    }

    // Handle HTTP errors from Apify
    if (!response.ok) {
      if (response.status === 401) {
        throw new ApifyError('Token da Apify inválido ou não autorizado.', 401, 'UNAUTHORIZED');
      }
      if (response.status === 429) {
        throw new ApifyError('Limite de requisições da Apify atingido.', 429, 'RATE_LIMIT');
      }
      const errorText = await response.text().catch(() => '');
      throw new ApifyError(
        `Erro retornado pela Apify (Status ${response.status}): ${errorText.slice(0, 150)}`,
        response.status >= 500 ? 502 : response.status,
        'APIFY_API_ERROR'
      );
    }

    let dataset: any;
    try {
      dataset = await response.json();
    } catch {
      throw new ApifyError('A Apify retornou uma resposta inválida (não JSON).', 502, 'INVALID_RESPONSE');
    }

    if (!Array.isArray(dataset) || dataset.length === 0) {
      throw new ApifyError('Esse perfil não existe, por favor coloque um perfil válido', 404, 'NOT_FOUND');
    }

    // Find the item corresponding to the username requested
    const item = dataset.find(
      (entry: any) => entry.username && entry.username.toLowerCase() === username
    ) || dataset[0];

    // Check if the actor flagged the profile as not found or error
    if (item.error === 'not_found' || item.errorDescription === 'Profile does not exist') {
      throw new ApifyError('Esse perfil não existe, por favor coloque um perfil válido', 404, 'NOT_FOUND');
    }

    if (!item.username && !item.fullName && !item.id) {
      throw new ApifyError('Esse perfil não existe, por favor coloque um perfil válido', 404, 'NOT_FOUND');
    }

    // Map Apify item fields to the exact InstagramProfile interface
    const profile: InstagramProfile = {
      handle: item.username || username,
      name: item.fullName || item.username || username,
      bio: item.biography || '',
      avatarUrl: item.profilePicUrlHD || item.profilePicUrl || '',
      followersCount: typeof item.followersCount === 'number' ? item.followersCount : 0,
      followingCount: typeof item.followsCount === 'number' ? item.followsCount : 0,
      postsCount: typeof item.postsCount === 'number' ? item.postsCount : 0,
      isVerified: Boolean(item.verified),
      isPrivate: Boolean(item.private),
      category: item.businessCategoryName || (item.private ? 'Conta Privada' : 'Perfil Público'),
      externalUrl: item.externalUrl || null,
      isRealData: true,
    };

    // Cache successful profile
    profileCache.set(username, {
      profile,
      timestamp: Date.now(),
    });

    return profile;
  })();

  inFlightRequests.set(username, executePromise);

  try {
    return await executePromise;
  } finally {
    inFlightRequests.delete(username);
  }
}
