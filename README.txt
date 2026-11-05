JUCEP RECEITA INTELIGENTE — CLOUDFLARE PAGES

1. Crie uma conta em https://dash.cloudflare.com/ (plano Free).
2. Crie um repositório GitHub e envie o conteúdo desta pasta, mantendo index.html na raiz e functions/api/receitas.js no caminho indicado.
3. No Cloudflare: Workers & Pages > Create > Pages > Connect to Git. Escolha o repositório.
4. Framework preset: None; build command: em branco; output directory: / (raiz).
5. Publique. A URL pages.dev exibirá o painel. Verifique que /api/receitas?ano=2025&mes=10 retorna somente JUCEP.
6. No Plone, publique um link para o painel. Se o iframe for autorizado e a política de segurança permitir, poderá incorporá-lo depois.

IMPORTANTE: não use apenas upload direto de arquivos estáticos sem verificar suporte a Pages Functions. O endpoint /api/receitas depende da Function.
O serviço consulta a API pública CODATA; não utiliza infraestrutura CODATA para hospedar o painel.
O painel não inclui autenticação e usa somente dados públicos. Consulte a política de TI da JUCEP antes de publicar em serviço externo.
Valores podem mudar quando a fonte atualizar. Sem conexão com a API, o painel mostra erro, não valores inventados.
