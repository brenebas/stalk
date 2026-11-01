import { fetchInstagramProfileApify, ApifyError } from '../../src/services/apifyInstagramService';
import { fetchInstagramProfileLive } from '../../src/services/instagramService';

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

    if (!rawUsername.trim()) {
      return res.status(400).json({
        error: 'O parâmetro username é obrigatório.',
        code: 'MISSING_USERNAME',
      });
    }

    const profileData = await fetchInstagramProfileApify(rawUsername, forceRefresh);
    return res.status(200).json(profileData);
  } catch (error: any) {
    const rawUsername =
      (req.query?.username as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('username') : '') ||
      '';

    if (error instanceof ApifyError) {
      if (error.statusCode === 403 || error.code === 'APIFY_API_ERROR' || error.statusCode === 429) {
        try {
          const fallback = await fetchInstagramProfileLive(rawUsername);
          return res.status(200).json(fallback);
        } catch {}
      }
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    try {
      const fallback = await fetchInstagramProfileLive(rawUsername);
      return res.status(200).json(fallback);
    } catch {}

    return res.status(500).json({
      error: 'Erro interno ao consultar perfil do Instagram.',
      code: 'INTERNAL_ERROR',
      message: error?.message || 'Erro desconhecido',
    });
  }
}
