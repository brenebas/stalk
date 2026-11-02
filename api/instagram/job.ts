/**
 * Vercel Serverless Function: GET/POST /api/instagram/job
 * Standalone & self-contained to avoid ESM file resolution errors on Vercel.
 */

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

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawToken = process.env.APIFY_API_TOKEN || '';
  const token = rawToken.trim().replace(/^['"]|['"]$/g, '');

  if (!token) {
    return res.status(500).json({ error: 'Token da Apify não configurado.', code: 'TOKEN_MISSING' });
  }

  try {
    if (req.method === 'GET') {
      const runId =
        (req.query?.runId as string) ||
        (req.url ? new URL(req.url, 'http://localhost').searchParams.get('runId') : '') ||
        '';

      if (!runId) {
        return res.status(400).json({ error: 'Parâmetro runId é obrigatório.', code: 'MISSING_RUN_ID' });
      }

      const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!statusRes.ok) {
        return res.status(statusRes.status).json({ error: 'Execução não encontrada na Apify.', code: 'RUN_NOT_FOUND' });
      }

      const statusData = await statusRes.json();
      const run = statusData.data;
      const status = run.status;
      const isFinished = ['SUCCEEDED', 'FAILED', 'TIMED-OUT', 'ABORTED'].includes(status);
      const isSuccess = status === 'SUCCEEDED';

      let items: any[] = [];
      if (isSuccess && run.defaultDatasetId) {
        const datasetRes = await fetch(`https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (datasetRes.ok) {
          items = await datasetRes.json();
        }
      }

      return res.status(200).json({
        runId,
        status,
        isFinished,
        isSuccess,
        defaultDatasetId: run.defaultDatasetId,
        items,
      });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
      const type = body.type || 'profile';
      const rawUsername = body.username || '';

      const validation = validateUsername(rawUsername);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error, code: 'INVALID_USERNAME' });
      }

      let actorId = 'apify/instagram-profile-scraper';
      let input: Record<string, any> = {
        usernames: [validation.clean],
        includeAboutSection: false,
      };

      if (type === 'connections') {
        actorId = 'apify/instagram-followers-following-scraper';
        input = {
          usernames: [validation.clean],
          maxItems: 20,
        };
      }

      const endpoint = `https://api.apify.com/v2/acts/${actorId.replace('/', '~')}/runs`;
      const runRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      if (!runRes.ok) {
        const errText = await runRes.text().catch(() => '');
        return res.status(runRes.status).json({
          error: `Falha ao iniciar Actor na Apify: ${errText.slice(0, 100)}`,
          code: 'RUN_START_FAILED',
        });
      }

      const runData = await runRes.json();
      return res.status(202).json({
        runId: runData.data?.id,
        status: runData.data?.status || 'RUNNING',
        actorId,
        type,
        username: validation.clean,
      });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Erro interno na execução assíncrona.' });
  }
}
