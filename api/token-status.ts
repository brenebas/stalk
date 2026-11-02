export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Strictly use server-side APIFY_API_TOKEN. Never access public VITE_ variables.
  const rawToken = (process.env.APIFY_API_TOKEN || '').trim().replace(/^['"]|['"]$/g, '');

  if (!rawToken) {
    return res.status(200).json({
      configured: false,
      status: 'Nenhum token encontrado na variável de ambiente APIFY_API_TOKEN do servidor.',
      tip: 'Configure APIFY_API_TOKEN em Settings > Environment Variables na Vercel e faça um Redeploy.',
    });
  }

  const isStripe = rawToken.startsWith('sk_live_') || rawToken.startsWith('sk_test_');
  const isApify = rawToken.startsWith('apify_api_');

  // Security: Never expose raw, partial or masked token strings in responses
  return res.status(200).json({
    configured: true,
    isApifyFormat: isApify,
    isStripeKey: isStripe,
    status: isApify
      ? 'OK: Token da Apify configurado com sucesso no servidor.'
      : isStripe
      ? 'ERRO: A credencial configurada é uma chave da Stripe e não da Apify. Obtenha o token em console.apify.com/account/integrations'
      : 'ATENÇÃO: O token configurado não começa com o prefixo padrão apify_api_. Verifique em console.apify.com/account/integrations',
  });
}
