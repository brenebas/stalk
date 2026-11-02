import {
  startActorRun,
  getActorRunStatus,
  getDatasetItems,
  ApifyBackendError,
  validateUsername,
} from '../lib/apifyBackendService';

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

  try {
    // 1. GET: Check status of an ongoing run and retrieve dataset if complete
    if (req.method === 'GET') {
      const runId =
        (req.query?.runId as string) ||
        (req.url ? new URL(req.url, 'http://localhost').searchParams.get('runId') : '') ||
        '';

      if (!runId) {
        return res.status(400).json({ error: 'Parâmetro runId é obrigatório.', code: 'MISSING_RUN_ID' });
      }

      const status = await getActorRunStatus(runId);

      let items: any[] = [];
      if (status.isSuccess && status.defaultDatasetId) {
        items = await getDatasetItems(status.defaultDatasetId, 20);
      }

      return res.status(200).json({
        ...status,
        items,
      });
    }

    // 2. POST: Start an asynchronous execution
    if (req.method === 'POST') {
      const body = typeof req.body === 'object' && req.body !== null ? req.body : {};
      const type = body.type || 'profile'; // 'profile' | 'connections'
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
          account: [validation.clean],
          dataToScrape: 'Followers',
          resultsLimit: 12,
        };
      }

      const run = await startActorRun(actorId, input);
      return res.status(202).json({
        message: 'Execução assíncrona iniciada com sucesso.',
        ...run,
      });
    }

    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    if (error instanceof ApifyBackendError) {
      return res.status(error.statusCode).json({
        error: error.message,
        code: error.code,
      });
    }

    return res.status(500).json({
      error: 'Erro interno no processamento assíncrono.',
      code: 'INTERNAL_ERROR',
    });
  }
}
