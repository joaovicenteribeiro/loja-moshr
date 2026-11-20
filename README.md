# MOSHR — Wear your own identity.

Primeira versão (demonstração) da loja MOSHR: site estático (`index.html`) + função de pagamento (`api/checkout.js`) com Mercado Pago Checkout Pro.

> Produtos, preços e estoque são **fictícios**. O estoque do site é simulado.

## Estrutura
- `index.html` — loja completa (home, catálogo, produto, sacola, checkout).
- `api/checkout.js` — cria o pagamento no Mercado Pago. Os preços são conferidos aqui, no servidor.
- `.env.example` — nomes das variáveis (não commite valores reais).

## Publicar (Vercel)
1. Suba este repositório no GitHub.
2. Na Vercel: **Add New > Project** e importe o repositório (sem build, é estático).
3. Em **Settings > Environment Variables** cadastre `MP_ACCESS_TOKEN` (credencial de **teste** do Mercado Pago) e `SITE_URL` (URL do site publicado).
4. Faça o redeploy.
5. No `index.html`, preencha `CONFIG.checkoutUrl` com `https://SEU-SITE.vercel.app/api/checkout`, commite e publique de novo.
6. Teste com contas de teste do Mercado Pago antes de usar credenciais de produção.

## Fornecedores (AliExpress / DSers)
Preencha `SUPPLIER` em `api/checkout.js` com o link de cada produto. O link vai nos metadados do pagamento no painel do Mercado Pago, para você fazer a compra manualmente (ou exportar para o DSers). Não há integração automática com a AliExpress/DSers nesta versão.

## Ainda NÃO existe
- Webhook de confirmação de pagamento (hoje o status do pedido só é visto no painel do Mercado Pago).
- Estoque real, contas de cliente, painel administrativo, banco de dados, rastreamento.
- Logo e caveira originais (usa o texto MOSHR). Coloque os SVGs em `brand/` e troque no `index.html`.

## Segurança
- Nunca commite `.env*` nem o Access Token. Se um token vazar, gere outro no painel do Mercado Pago.
