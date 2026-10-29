export interface InstagramProfile {
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
}

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

// In-memory cache for the serverless container
const cache = new Map<string, { profile: InstagramProfile; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;

function cleanUsername(raw: string): string {
  if (!raw) {
    throw new ApifyError('O nome de usuário não pode estar vazio.', 400, 'INVALID_USERNAME');
  }
  const cleaned = raw.trim().replace(/^@/, '').toLowerCase();
  if (cleaned.length === 0 || cleaned.length > 30) {
    throw new ApifyError('O nome de usuário deve ter entre 1 e 30 caracteres.', 400, 'INVALID_USERNAME');
  }
  if (!/^[a-z0-9._]+$/.test(cleaned)) {
    throw new ApifyError('O nome de usuário contém caracteres inválidos.', 400, 'INVALID_USERNAME');
  }
  return cleaned;
}

export default async function handler(req: any, res: any) {
  // CORS & Cache-Control headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUsername =
      (req.query?.username as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('username') : '') ||
      '';

    const forceRefresh =
      req.query?.refresh === 'true' ||
      req.query?.nocache === 'true' ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('refresh') === 'true' : false);

    const username = cleanUsername(rawUsername);

    // 1. Check in-memory cache
    if (!forceRefresh) {
      const cached = cache.get(username);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return res.status(200).json(cached.profile);
      }
    } else {
      cache.delete(username);
    }

    // 2. Validate token
    const rawToken = process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN || '';
    const apiToken = rawToken.trim().replace(/^['"]|['"]$/g, '');

    if (!apiToken) {
      return res.status(500).json({
        error: 'Token da Apify não configurado. Adicione a variável APIFY_API_TOKEN na Vercel.',
        code: 'TOKEN_NOT_CONFIGURED',
      });
    }

    if (apiToken.startsWith('sk_live_') || apiToken.startsWith('sk_test_')) {
      return res.status(401).json({
        error: 'A chave configurada (sk_live_...) é da Stripe e não da Apify. Obtenha o token em console.apify.com/account/integrations (começa com apify_api_).',
        code: 'INVALID_APIFY_TOKEN',
      });
    }

    const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 28000);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
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
        return res.status(504).json({
          error: 'A consulta ao Instagram excedeu o tempo limite. Tente novamente.',
          code: 'TIMEOUT',
        });
      }
      return res.status(502).json({
        error: `Falha de conexão com a Apify: ${err?.message || 'Erro de rede'}`,
        code: 'NETWORK_ERROR',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({
          error: 'Token da Apify inválido ou não autorizado.',
          code: 'UNAUTHORIZED',
        });
      }
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Limite de requisições da Apify atingido.',
          code: 'RATE_LIMIT',
        });
      }
      return res.status(response.status >= 500 ? 502 : response.status).json({
        error: 'Erro no serviço da Apify ao consultar Instagram.',
        code: 'APIFY_API_ERROR',
      });
    }

    const dataset = await response.json();

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return res.status(404).json({
        error: 'Esse perfil não existe, por favor coloque um perfil válido',
        code: 'NOT_FOUND',
      });
    }

    const item =
      dataset.find((entry: any) => entry.username && entry.username.toLowerCase() === username) || dataset[0];

    if (item.error === 'not_found' || item.errorDescription === 'Profile does not exist') {
      return res.status(404).json({
        error: 'Esse perfil não existe, por favor coloque um perfil válido',
        code: 'NOT_FOUND',
      });
    }

    if (!item.username && !item.fullName && !item.id) {
      return res.status(404).json({
        error: 'Esse perfil não existe, por favor coloque um perfil válido',
        code: 'NOT_FOUND',
      });
    }

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

    cache.set(username, { profile, timestamp: Date.now() });

    return res.status(200).json(profile);
  } catch (error: any) {
    if (error instanceof ApifyError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    return res.status(500).json({
      error: 'Erro interno ao consultar perfil do Instagram.',
      code: 'INTERNAL_ERROR',
      message: error?.message || 'Erro desconhecido',
    });
  }
}
