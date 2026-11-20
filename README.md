# MOSHR — Wear your own identity.

Loja de moda alternativa: site estático (`public/`), funções serverless (`api/`) e pagamento pelo **Mercado Pago (Checkout Pro)**. Produtos vêm de `data/products.json` (fornecedor: AliExpress, compra manual ou via DSers).

> Os 15 produtos que acompanham o repositório são **demonstração** (`"demo": true`). Substitua pelos seus antes de vender.

## Estrutura
- `public/index.html` — loja (home, catálogo, produto, sacola, checkout). Fotos em `public/images/`.
- `data/products.json` — catálogo completo, incluindo custo e link da AliExpress. **Fica fora de `public/`**: nunca é servido diretamente.
- `api/products.js` — entrega ao site só os campos públicos (sem custo, sem link do fornecedor).
- `api/checkout.js` — confere preços e variantes no servidor e cria o pagamento no Mercado Pago.
- `tools/import-csv.mjs` — converte uma planilha CSV em `data/products.json`.
- `.env.example` — nomes das variáveis (não commite valores reais).

## Colocar os produtos da AliExpress
1. Escolha o produto na AliExpress (ou no DSers) e anote: link, custo, tamanhos e cores disponíveis.
2. Preencha `data/modelo-produtos.csv` (uma linha por produto; tamanhos e cores separados por `|`).
3. Salve as fotos em `public/images/` e informe o caminho na coluna `imagem` (ex.: `images/camiseta.jpg`). Use fotos que você tem autorização de usar (do fornecedor, se permitido, ou próprias).
4. Rode `node tools/import-csv.mjs data/modelo-produtos.csv`. O script valida tudo e avisa se a margem estiver baixa.
5. Commite e publique.

Não há importação automática por link: a AliExpress só oferece API a parceiros aprovados, e copiar páginas por scraping não é permitido. A entrada é por planilha.

## Publicar (Vercel)
1. Suba o repositório no GitHub e importe na Vercel (sem comando de build; o `vercel.json` já aponta para `public/`).
2. Em **Settings > Environment Variables**: `MP_ACCESS_TOKEN` (credencial de **teste** no começo) e `SITE_URL` (endereço do site).
3. Redeploy e teste a compra com as contas de teste do Mercado Pago.
4. Só depois troque para as credenciais de produção.

## Fluxo de um pedido
Cliente paga no Mercado Pago → você vê o pagamento aprovado no painel do Mercado Pago → abre os metadados do pagamento (tem produto, tamanho, cor, link da AliExpress, endereço) → compra na AliExpress/DSers com o endereço do cliente → envia o rastreio por WhatsApp/e-mail.

## Ainda NÃO existe
- Webhook de confirmação de pagamento e banco de pedidos (a conferência é manual).
- Estoque real: o site não sabe se o item acabou na AliExpress.
- Contas de cliente, painel admin, rastreio automático.
- Logo e caveira originais (usa o texto MOSHR).

## Segurança
- Nunca commite `.env*` nem o Access Token. Se vazar, gere outro no painel do Mercado Pago.
- Preços e variantes são sempre conferidos em `api/checkout.js`.
- Informe prazo de entrega (10 a 20 dias úteis) com clareza e respeite o direito de arrependimento de 7 dias (CDC).
