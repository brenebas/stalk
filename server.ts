import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { 
  fetchInstagramProfileApify, 
  fetchInstagramConnectionsApify, 
  ApifyError, 
  clearApifyCache 
} from './src/services/apifyInstagramService';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Anti-cache middleware: ensure HTML documents, JS modules, and API responses are never cached stale
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
  clearApifyCache();
  return res.json({ success: true, message: 'Cache limpo com sucesso.' });
});

// Endpoint to check token status
app.get('/api/token-status', (_req, res) => {
  const rawToken = (process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN || '').trim().replace(/^['"]|['"]$/g, '');

  if (!rawToken) {
    return res.json({
      configured: false,
      message: 'Nenhum token encontrado em APIFY_API_TOKEN ou VITE_APIFY_API_TOKEN.',
    });
  }

  const isStripe = rawToken.startsWith('sk_live_') || rawToken.startsWith('sk_test_');
  const isApify = rawToken.startsWith('apify_api_');

  return res.json({
    configured: true,
    maskedToken: rawToken.slice(0, 10) + '...' + rawToken.slice(-4),
    tokenLength: rawToken.length,
    isApifyFormat: isApify,
    isStripeKey: isStripe,
    status: isApify
      ? 'OK: Token da Apify válido e configurado.'
      : isStripe
      ? 'ERRO: Esta é uma chave da Stripe (sk_live_...) e não da Apify. Obtenha o token em console.apify.com/account/integrations'
      : 'ATENÇÃO: O token configurado não começa com apify_api_. Verifique em console.apify.com/account/integrations',
  });
});

// API: Official Apify Instagram Profile endpoint: GET /api/instagram/profile?username=
app.get('/api/instagram/profile', async (req, res) => {
  try {
    const username = (req.query.username as string) || '';
    const forceRefresh = req.query.refresh === 'true' || req.query.nocache === 'true';

    if (!username.trim()) {
      return res.status(400).json({
        error: 'O parâmetro username é obrigatório.',
        code: 'MISSING_USERNAME',
      });
    }

    const profileData = await fetchInstagramProfileApify(username, forceRefresh);
    return res.json(profileData);
  } catch (error: any) {
    if (error instanceof ApifyError) {
      if (error.statusCode === 403 || error.code === 'APIFY_API_ERROR' || error.statusCode === 429) {
        try {
          const { fetchInstagramProfileLive } = await import('./src/services/instagramService');
          const fallback = await fetchInstagramProfileLive(req.query.username as string);
          return res.json(fallback);
        } catch {}
      }
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    try {
      const { fetchInstagramProfileLive } = await import('./src/services/instagramService');
      const fallback = await fetchInstagramProfileLive(req.query.username as string);
      return res.json(fallback);
    } catch {}
    return res.status(500).json({
      error: 'Erro interno ao consultar perfil do Instagram.',
      code: 'INTERNAL_ERROR',
      message: error?.message || 'Erro desconhecido',
    });
  }
});

// API: Get real connections (following & followers) using Apify
app.get('/api/instagram/connections', async (req, res) => {
  try {
    const username = (req.query.username as string) || '';
    const thirdProfile = (req.query.thirdProfile as string) || '';
    const gender = (req.query.gender as 'female' | 'male') || undefined;
    if (!username.trim()) {
      return res.status(400).json({
        error: 'O parâmetro username é obrigatório.',
        code: 'MISSING_USERNAME',
      });
    }

    const connections = await fetchInstagramConnectionsApify(username, false, thirdProfile, gender);
    return res.json({ connections });
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.error('Erro ao buscar conexões reais do Instagram:', error);
    }
    return res.status(200).json({
      connections: [],
    });
  }
});

// Backward-compatible alias: GET /api/instagram/:handle
app.get('/api/instagram/:handle', async (req, res) => {
  try {
    const handle = req.params.handle;
    if (!handle) {
      return res.status(400).json({
        error: 'Handle é obrigatório',
        code: 'MISSING_USERNAME',
      });
    }

    const profileData = await fetchInstagramProfileApify(handle);
    return res.json(profileData);
  } catch (error: any) {
    if (error instanceof ApifyError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }
    console.error('Erro ao buscar perfil do Instagram:', error);
    return res.status(500).json({
      error: 'Falha ao buscar perfil do Instagram',
      code: 'INTERNAL_ERROR',
      message: error?.message || 'Erro desconhecido',
    });
  }
});

// API: Proxy Instagram CDN images to prevent HTTP 403 Forbidden from hotlinking protection
app.get('/api/proxy-image', async (req, res) => {
  try {
    let imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('URL não informada');
    }

    // Unwrap if accidentally double-proxied or nested
    while (imageUrl.includes('/api/proxy-image?url=')) {
      const idx = imageUrl.indexOf('/api/proxy-image?url=');
      imageUrl = decodeURIComponent(imageUrl.slice(idx + '/api/proxy-image?url='.length));
    }

    // Clean up HTML entities in signed CDN query parameters
    imageUrl = imageUrl.replace(/&amp;/g, '&');

    // Safety check: only proxy legitimate image domains
    const parsed = new URL(imageUrl);
    const validDomains = ['cdninstagram.com', 'fbcdn.net', 'instagram.com', 'fbsbx.com', 'facebook.com', 'akamaihd.net'];
    const isDomainAllowed = validDomains.some(d => parsed.hostname.endsWith(d)) || parsed.hostname.includes('cdninstagram') || parsed.hostname.includes('fbcdn');

    if (!isDomainAllowed) {
      return res.status(403).send('Domínio não permitido');
    }

    const imageRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.instagram.com/',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });

    if (!imageRes.ok) {
      return res.status(imageRes.status).send('Erro ao buscar imagem');
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h

    const arrayBuffer = await imageRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
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
