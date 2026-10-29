import 'dotenv/config';
import { fetchInstagramProfileApify, ApifyError } from '../../src/services/apifyInstagramService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
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
    const username = rawUsername.trim().replace(/^@/, '');
    
    if (!username) {
      return res.status(400).json({
        error: 'Esse perfil não existe, por favor coloque um perfil válido',
        code: 'MISSING_USERNAME'
      });
    }

    console.log(`[API /api/instagram/profile] Buscando perfil real para @${username}...`);
    const profileData = await fetchInstagramProfileApify(username);
    return res.status(200).json(profileData);
  } catch (error: any) {
    if (error instanceof ApifyError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code
      });
    }

    return res.status(500).json({
      error: 'Esse perfil não existe, por favor coloque um perfil válido',
      code: 'INTERNAL_ERROR'
    });
  }
}
