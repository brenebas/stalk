/**
 * Vercel Serverless Function: GET /api/instagram/connections?username=...
 * Standalone & self-contained to avoid ESM file resolution errors on Vercel.
 */

const connectionsCache = new Map<string, { connections: any[]; timestamp: number }>();
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
        connections: [],
        isRealData: false,
      });
    }
    const username = validation.clean;

    const forceRefresh =
      req.query?.refresh === 'true' ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('refresh') === 'true' : false);

    if (!forceRefresh) {
      const cached = connectionsCache.get(username);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return res.status(200).json({ connections: cached.connections, count: cached.connections.length, isRealData: true });
      }
    }

    const rawToken = process.env.APIFY_API_TOKEN || '';
    const token = rawToken.trim().replace(/^['"]|['"]$/g, '');

    if (!token) {
      return res.status(200).json({
        connections: [],
        count: 0,
        isRealData: true,
        message: 'Token da Apify não configurado no servidor.',
      });
    }

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
      return res.status(200).json({
        connections: [],
        count: 0,
        isRealData: true,
        message: err.name === 'AbortError' ? 'Timeout ao consultar conexões' : 'Falha na rede ao consultar conexões',
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      return res.status(200).json({
        connections: [],
        count: 0,
        isRealData: true,
        message: `Apify retornou status ${response.status}`,
      });
    }

    let dataset: any[];
    try {
      dataset = await response.json();
    } catch {
      return res.status(200).json({ connections: [], count: 0, isRealData: true, message: 'Formato inválido de dataset' });
    }

    if (!Array.isArray(dataset)) {
      return res.status(200).json({ connections: [], count: 0, isRealData: true });
    }

    const connections = dataset
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
    return res.status(200).json({ connections, count: connections.length, isRealData: true });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Erro ao consultar conexões do Instagram: ' + (error?.message || ''),
      code: 'INTERNAL_ERROR',
      connections: [],
      isRealData: false,
    });
  }
}
