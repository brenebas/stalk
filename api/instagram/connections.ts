import { fetchInstagramConnectionsApify } from '../../src/services/apifyInstagramService';

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
    const username =
      (req.query?.username as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('username') : '') ||
      '';

    const thirdProfile =
      (req.query?.thirdProfile as string) ||
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('thirdProfile') : '') ||
      '';

    const gender =
      ((req.query?.gender as string) ||
        (req.url ? new URL(req.url, 'http://localhost').searchParams.get('gender') : '')) as 'female' | 'male' | undefined;

    if (!username.trim()) {
      return res.status(400).json({
        error: 'O parâmetro username é obrigatório.',
        code: 'MISSING_USERNAME',
      });
    }

    const connections = await fetchInstagramConnectionsApify(username, false, thirdProfile, gender || undefined);
    return res.status(200).json({ connections });
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.error('Erro ao buscar conexões reais do Instagram na Vercel:', error);
    }
    return res.status(200).json({ connections: [] });
  }
}
