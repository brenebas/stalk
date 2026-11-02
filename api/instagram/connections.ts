import {
  fetchInstagramConnections,
  ApifyBackendError,
} from '../lib/apifyBackendService';

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

    const forceRefresh =
      req.query?.refresh === 'true' ||
      req.query?.nocache === 'true' ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('refresh') === 'true' : false);

    const result = await fetchInstagramConnections(rawUsername, forceRefresh);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof ApifyBackendError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
        connections: [],
        isRealData: false,
      });
    }

    return res.status(500).json({
      error: 'Erro interno ao consultar conexões.',
      code: 'INTERNAL_ERROR',
      connections: [],
      isRealData: false,
    });
  }
}
