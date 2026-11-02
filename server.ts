import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  fetchInstagramProfile,
  fetchInstagramConnections,
  startActorRun,
  getActorRunStatus,
  getDatasetItems,
  validateUsername,
  clearBackendCache,
  ApifyBackendError,
} from './src/services/apifyInstagramService.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Anti-cache middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api/proxy-image')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Endpoint to force-clear server-side memory cache
app.post('/api/clear-cache', (_req, res) => {
  clearBackendCache();
  return res.json({ success: true, message: 'Cache limpo com sucesso.' });
});

// Endpoint to check token status securely without credential leakage
app.get('/api/token-status', (_req, res) => {
  const rawToken = (process.env.APIFY_API_TOKEN || '').trim().replace(/^['"]|['"]$/g, '');

  if (!rawToken) {
    return res.json({
      configured: false,
      status: 'Nenhum token encontrado na variável de ambiente APIFY_API_TOKEN do servidor.',
      tip: 'Configure APIFY_API_TOKEN no arquivo .env ou no painel da Vercel.',
    });
  }

  const isStripe = rawToken.startsWith('sk_live_') || rawToken.startsWith('sk_test_');
  const isApify = rawToken.startsWith('apify_api_');

  return res.json({
    configured: true,
    isApifyFormat: isApify,
    isStripeKey: isStripe,
    status: isApify
      ? 'OK: Token da Apify configurado com sucesso no servidor.'
      : isStripe
      ? 'ERRO: A credencial configurada é uma chave da Stripe e não da Apify.'
      : 'ATENÇÃO: O token configurado não começa com o prefixo padrão apify_api_.',
  });
});

// API: Official Apify Instagram Profile endpoint: GET /api/instagram/profile?username=
app.get('/api/instagram/profile', async (req, res) => {
  try {
    const rawUsername = (req.query.username as string) || '';
    const forceRefresh = req.query.refresh === 'true' || req.query.nocache === 'true';

    const profileData = await fetchInstagramProfile(rawUsername, forceRefresh);
    if (profileData.isPrivate) {
      return res.status(403).json({
        error: 'Este perfil está privado. Para realizar a análise, você precisa deixar o perfil público (aberto) no Instagram.',
        code: 'PRIVATE_PROFILE',
        isPrivate: true,
        isRealData: true,
      });
    }
    return res.json(profileData);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const code = error?.code || 'INTERNAL_ERROR';
    const message = error?.message || 'Erro interno ao consultar perfil do Instagram.';

    return res.status(statusCode).json({
      error: message,
      code,
      isRealData: false,
    });
  }
});

// API: Get real connections (followers/following) using Apify
app.get('/api/instagram/connections', async (req, res) => {
  try {
    const rawUsername = (req.query.username as string) || '';
    const forceRefresh = req.query.refresh === 'true';

    const result = await fetchInstagramConnections(rawUsername, forceRefresh);
    return res.json(result);
  } catch (error: any) {
    const statusCode = error?.statusCode || 500;
    const code = error?.code || 'INTERNAL_ERROR';
    const message = error?.message || 'Erro ao consultar conexões do Instagram.';

    return res.status(statusCode).json({
      error: message,
      code,
      connections: [],
      isRealData: false,
    });
  }
});

// API: Asynchronous Actor Job handler (start and check status)
app.get('/api/instagram/job', async (req, res) => {
  try {
    const runId = (req.query.runId as string) || '';
    if (!runId) {
      return res.status(400).json({ error: 'Parâmetro runId é obrigatório.', code: 'MISSING_RUN_ID' });
    }

    const status = await getActorRunStatus(runId);
    let items: any[] = [];
    if (status.isSuccess && status.defaultDatasetId) {
      items = await getDatasetItems(status.defaultDatasetId, 20);
    }

    return res.json({ ...status, items });
  } catch (error: any) {
    if (error instanceof ApifyBackendError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: 'Erro ao verificar execução assíncrona.' });
  }
});

app.post('/api/instagram/job', async (req, res) => {
  try {
    const body = req.body || {};
    const type = body.type || 'profile';
    const validation = validateUsername(body.username || '');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error, code: 'INVALID_USERNAME' });
    }

    const actorId = type === 'connections'
      ? 'apify/instagram-followers-following-scraper'
      : 'apify/instagram-profile-scraper';

    const input = type === 'connections'
      ? { account: [validation.clean], dataToScrape: 'Followers', resultsLimit: 12 }
      : { usernames: [validation.clean], includeAboutSection: false };

    const run = await startActorRun(actorId, input);
    return res.status(202).json({ message: 'Execução assíncrona iniciada.', ...run });
  } catch (error: any) {
    if (error instanceof ApifyBackendError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: 'Erro ao iniciar execução assíncrona.' });
  }
});

// API: Proxy Instagram CDN images
app.get('/api/proxy-image', async (req, res) => {
  try {
    let imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('URL não informada');
    }

    while (imageUrl.includes('/api/proxy-image?url=')) {
      const idx = imageUrl.indexOf('/api/proxy-image?url=');
      imageUrl = decodeURIComponent(imageUrl.slice(idx + '/api/proxy-image?url='.length));
    }

    imageUrl = imageUrl.replace(/&amp;/g, '&');

    const parsed = new URL(imageUrl);
    const validDomains = ['cdninstagram.com', 'fbcdn.net', 'instagram.com', 'fbsbx.com', 'facebook.com', 'akamaihd.net'];
    const isDomainAllowed = validDomains.some((d) => parsed.hostname.endsWith(d)) || parsed.hostname.includes('cdninstagram') || parsed.hostname.includes('fbcdn');

    if (!isDomainAllowed) {
      return res.status(403).send('Domínio não permitido');
    }

    const imageRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        Referer: 'https://www.instagram.com/',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!imageRes.ok) {
      return res.status(imageRes.status).send('Erro ao buscar imagem');
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    const arrayBuffer = await imageRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch {
    return res.status(500).send('Erro no proxy de imagem');
  }
});

// Full-stack Vite integration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 StalkRadar Server rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha fatal ao iniciar servidor:', err);
  process.exit(1);
});
