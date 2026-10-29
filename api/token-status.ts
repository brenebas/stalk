export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  const rawToken = (process.env.APIFY_API_TOKEN || process.env.VITE_APIFY_API_TOKEN || '').trim().replace(/^['"]|['"]$/g, '');

  if (!rawToken) {
    return res.status(200).json({
      configured: false,
      message: 'Nenhuma chave encontrada em APIFY_API_TOKEN ou VITE_APIFY_API_TOKEN.',
      tip: 'Verifique se você adicionou em Settings > Environment Variables na Vercel e fez um Redeploy.',
    });
  }

  const isStripe = rawToken.startsWith('sk_live_') || rawToken.startsWith('sk_test_');
  const isApify = rawToken.startsWith('apify_api_');

  return res.status(200).json({
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
}
