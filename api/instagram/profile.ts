/**
 * Vercel Serverless Function: GET /api/instagram/profile?username=...
 * Standalone & self-contained to avoid ESM file resolution errors on Vercel.
 */

// In-memory cache for repeated lookups
const profileCache = new Map<string, { profile: any; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000;

function cleanInstagramHandle(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let str = raw.trim();
  str = str.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '');
  str = str.split('?')[0].split('/')[0];
  str = str.replace(/^@+\s*/, '').trim();
  return str.toLowerCase();
}

function validateUsername(raw: string): { valid: boolean; clean: string; error?: string } {
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

function toSafeNumber(val: any, fallback: number = 0): number {
  const n = Number(val);
  return typeof n === 'number' && !isNaN(n) && isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function toProxyUrl(url?: string): string {
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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUsername =
      (req.query?.username as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('username') : '') ||
      '';

    const validation = validateUsername(rawUsername);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.error || 'Nome de usuário inválido.',
        code: 'INVALID_USERNAME',
        isRealData: false,
      });
    }
    const username = validation.clean;

    const forceRefresh =
      req.query?.refresh === 'true' ||
      req.query?.nocache === 'true' ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('refresh') === 'true' : false);

    // Cache check
    if (!forceRefresh) {
      const cached = profileCache.get(username);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.status(200).json(cached.profile);
      }
    }

    // Require token
    const rawToken = process.env.APIFY_API_TOKEN || '';
    const token = rawToken.trim().replace(/^['"]|['"]$/g, '');

    if (!token) {
      return res.status(500).json({
        error: 'Token da Apify (APIFY_API_TOKEN) não configurado nas variáveis de ambiente do servidor.',
        code: 'TOKEN_MISSING',
        isRealData: false,
      });
    }

    if (token.startsWith('sk_live_') || token.startsWith('sk_test_')) {
      return res.status(401).json({
        error: 'A credencial configurada é uma chave da Stripe e não da Apify. O token da Apify começa com apify_api_.',
        code: 'INVALID_TOKEN_FORMAT',
        isRealData: false,
      });
    }

    // Call Apify Actor
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 24000);

    const endpoint = 'https://api.apify.com/v2/actors/apify~instagram-profile-scraper/run-sync-get-dataset-items?timeout=22';

    let apifyRes: Response;
    try {
      apifyRes = await fetch(endpoint, {
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
        return res.status(504).json({
          error: 'A consulta na Apify excedeu o tempo limite de resposta (timeout). Tente novamente.',
          code: 'TIMEOUT',
          isRealData: false,
        });
      }
      return res.status(502).json({
        error: `Falha de conexão com os servidores da Apify: ${err.message || 'Erro de rede'}`,
        code: 'NETWORK_ERROR',
        isRealData: false,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!apifyRes.ok) {
      if (apifyRes.status === 401) {
        return res.status(401).json({
          error: 'Token da Apify inválido ou não autorizado.',
          code: 'UNAUTHORIZED',
          isRealData: false,
        });
      }
      if (apifyRes.status === 403) {
        return res.status(403).json({
          error: 'Limite de uso/cota da Apify atingido ou acesso bloqueado.',
          code: 'USAGE_LIMIT',
          isRealData: false,
        });
      }
      if (apifyRes.status === 429) {
        return res.status(429).json({
          error: 'Limite de requisições por minuto da Apify atingido.',
          code: 'RATE_LIMIT',
          isRealData: false,
        });
      }
      const errText = await apifyRes.text().catch(() => '');
      return res.status(apifyRes.status >= 500 ? 502 : apifyRes.status).json({
        error: `Erro retornado pela Apify (Status ${apifyRes.status}): ${errText.slice(0, 140)}`,
        code: 'APIFY_API_ERROR',
        isRealData: false,
      });
    }

    let dataset: any;
    try {
      dataset = await apifyRes.json();
    } catch {
      return res.status(502).json({
        error: 'A Apify retornou uma resposta em formato inválido.',
        code: 'INVALID_RESPONSE',
        isRealData: false,
      });
    }

    if (!Array.isArray(dataset) || dataset.length === 0) {
      return res.status(404).json({
        error: 'Esse perfil não existe ou não foi encontrado no Instagram. Por favor, coloque um perfil válido.',
        code: 'NOT_FOUND',
        isRealData: false,
      });
    }

    const item = dataset.find(
      (entry: any) => entry.username && entry.username.toLowerCase() === username
    ) || dataset[0];

    if (
      item.error === 'not_found' ||
      item.errorDescription === 'Profile does not exist' ||
      (!item.username && !item.fullName && !item.id)
    ) {
      return res.status(404).json({
        error: 'Esse perfil não existe ou não foi encontrado no Instagram. Por favor, coloque um perfil válido.',
        code: 'NOT_FOUND',
        isRealData: false,
      });
    }

    const rawPic = item.profilePicUrlHD || item.profilePicUrl || '';
    const avatarUrl = toProxyUrl(rawPic);

    // Guaranteed safe postsCount, followersCount, followingCount
    const postsCount = toSafeNumber(item.postsCount, 0);
    const followersCount = toSafeNumber(item.followersCount, 0);
    const followingCount = toSafeNumber(item.followsCount, 0);

    const profile = {
      handle: item.username || username,
      name: item.fullName || item.username || username,
      bio: typeof item.biography === 'string' ? item.biography : '',
      avatarUrl,
      followersCount,
      followingCount,
      postsCount,
      isVerified: Boolean(item.verified),
      isPrivate: item.private === true || item.isPrivate === true || item.is_private === true,
      category: item.businessCategoryName || (item.private ? 'Conta Privada' : 'Perfil Público'),
      externalUrl: item.externalUrl || null,
      isRealData: true,
      isDemo: false,
    };

    if (profile.isPrivate) {
      return res.status(403).json({
        error: 'Este perfil está privado. Para realizar a análise, você precisa deixar o perfil público (aberto) no Instagram.',
        code: 'PRIVATE_PROFILE',
        isPrivate: true,
        isRealData: true,
      });
    }

    profileCache.set(username, { profile, timestamp: Date.now() });
    return res.status(200).json(profile);
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro interno ao consultar perfil do Instagram: ' + (error?.message || ''),
      code: 'INTERNAL_ERROR',
      isRealData: false,
    });
  }
}
