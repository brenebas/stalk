export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawUrl = 
      (req.query?.url as string) || 
      (req.url ? new URL(req.url, 'http://localhost').searchParams.get('url') : '') || 
      '';

    if (!rawUrl) {
      return res.status(400).send('URL não informada');
    }

    const parsed = new URL(rawUrl);
    const validDomains = ['cdninstagram.com', 'fbcdn.net', 'instagram.com', 'fbsbx.com'];
    const isDomainAllowed = validDomains.some((d) => parsed.hostname.endsWith(d));

    if (!isDomainAllowed) {
      return res.status(403).send('Domínio não permitido');
    }

    const imageRes = await fetch(rawUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        Referer: 'https://www.instagram.com/',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!imageRes.ok) {
      return res.status(imageRes.status).send('Erro ao buscar imagem no Instagram CDN');
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await imageRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(500).send('Erro no proxy de imagem');
  }
}
