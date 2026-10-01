# Cadastro da liturgia — Emaús

O site usa apenas arquivos locais preenchidos pelo responsável. Setembro e outubro de 2026 começam sem conteúdo publicado: nenhum exemplo é apresentado como leitura religiosa real. O santo do topo permanece independente e não foi alterado.

## Preencher setembro e outubro

1. Abra `data/modelo-31-dias.js`: a entrada `01` mostra todos os campos. Copie as entradas necessárias para `data/2026-09.js`, dentro de `export const liturgias = { ... }`.
2. Substitua todos os textos `[EXEMPLO]` por conteúdo conferido e autorizado. Remova `exemplo: true` somente quando terminar. `publicado: false` também permite manter um rascunho. Uma entrada `{}` ou sem `celebracao` preenchida não é publicada.
3. Use chaves com dois dígitos (`'01'`, `'02'`), correspondentes ao dia do arquivo mensal. Setembro vai até 30; outubro até 31. O campo opcional `data: '2026-09-01'`, se informado, deve coincidir com o dia; divergências impedem a exibição.
4. Para outubro, preencha `data/2026-10.js` da mesma forma. Ambos os meses já estão cadastrados no índice.
5. Para outro mês/ano, copie o modelo para `data/AAAA-MM.js` e acrescente uma linha de cadastro em `data/indice.js`, por exemplo: `'2026-11': () => import('./2026-11.js'),`. Não é necessário modificar `js/liturgia.js`. Esse índice simples evita pedidos 404 para meses que ainda não existem; mantenha nele apenas arquivos presentes.

`texto` aceita uma string (separe parágrafos por uma linha em branco) ou uma lista de strings. HTML é exibido literalmente, sem execução. Os campos de `aprendaMais` são opcionais; campos vazios e accordions sem conteúdo não aparecem. Leitura sem texto não gera card. Salmo aparece com texto ou refrão. Use `segundaLeitura: null` quando não houver; homilia vazia também não gera card. Não há player de áudio fictício.

`corLiturgica` aceita `verde`, `roxo`, `branco`, `vermelho` ou `rosa` e colore o ponto e a borda dos cards. A paleta e o tema do restante da página permanecem iguais.

## Vídeo

Preencha `video: { youtubeId: 'ID_DO_VIDEO' }` com o ID real de 11 caracteres (letras, números, `_` ou `-`), não com a URL inteira. `null`, ausência ou formato inválido mostram “Santa Missa de Hoje” e “A celebração em vídeo estará disponível em breve.” O formato válido não garante que o vídeo exista ou permita incorporação; confira isso no YouTube. O iframe usa exclusivamente `https://www.youtube.com/embed/ID`, sem download ou armazenamento do vídeo.

## Executar e atualizar

Abra pelo Live Server do VS Code ou outro servidor HTTP local. Módulos JavaScript não funcionam corretamente ao abrir o HTML diretamente por `file://`. Na hospedagem estática, envie juntos HTML, CSS, `js/` e `data/`, servindo `.js` como JavaScript. Não é necessário backend, API ou build.

A data vem de `Intl.DateTimeFormat` no fuso `America/Sao_Paulo`, independentemente do fuso do computador (o relógio precisa estar correto). Um temporizador agenda a próxima meia-noite; retorno à aba, foco e restauração da página conferem novamente a data após suspensão. Meses, anos e bissextos seguem o calendário do fuso. Dias ausentes nunca reutilizam a leitura anterior.

Ao editar um ID ou texto já publicado, envie novamente o arquivo mensal e recarregue a página. Módulos ficam em cache na aba: o site não consulta edições a cada segundo nem promete atualização instantânea de conteúdo no mesmo dia. Configure revalidação de cache HTTP (`Cache-Control: no-cache`) para HTML e arquivos de dados/índice na hospedagem; caso haja cache antigo, faça recarga forçada. Novos meses também exigem publicar o índice atualizado. Erros reais de arquivo cadastrado (arquivo faltando, sintaxe ou rede) mantêm o estado indisponível e emitem um aviso no console.

## Validação local

Execute `node --test tests/liturgia.test.mjs` (Node 22 ou posterior). Os testes usam apenas o Node, sem instalar dependências.

## Notícias automáticas — Vatican News

A página lê as três notícias mais recentes de `data/noticias.json`, com título, trecho do resumo, data e imagem fornecidos pelo RSS oficial em português: https://www.vaticannews.va/pt.rss.xml. Títulos, imagens e botões abrem a reportagem original em outra aba. Não há reprodução do artigo completo.

O coletor `scripts/atualizar-noticias.ps1` requer PowerShell 7. Execute `pwsh -File scripts/atualizar-noticias.ps1` para sincronizar. Não requer chave de API nem proxy de terceiros. O RSS não libera CORS; por isso a coleta acontece fora do navegador e a página lê apenas o JSON do próprio site. Falhas de rede, XML inválido ou feed vazio preservam o arquivo anterior. URLs são restritas ao domínio oficial, o HTML do resumo é removido e entidades XML externas são proibidas.

A aba consulta o JSON ao abrir, ao retornar ao site e a cada 15 minutos enquanto estiver visível. Isso não coleta o RSS: o coletor deve ser executado no servidor ou por CI. Após 36 horas sem sincronização, a página identifica a última atualização disponível. As imagens dependem do servidor do Vatican News.

### Ativação na hospedagem

O workflow `.github/workflows/noticias.yml` está preparado para sincronizar diariamente às 06h23, 12h23 e 18h23 de Brasília (09h23, 15h23 e 21h23 UTC). Os horários do GitHub Actions são aproximados. Também permite execução manual. É necessário publicar estes arquivos no branch padrão do repositório, habilitar Actions e permitir escrita de conteúdo para que o workflow grave o JSON. Proteções do branch podem exigir ajuste. Workflows agendados em repositórios públicos podem ser suspensos pelo GitHub após inatividade.

Para GitHub Pages, configure a origem como **GitHub Actions** e crie a variável de repositório `PUBLICAR_GITHUB_PAGES=true`. O próprio workflow publicará o site após atualizar as notícias, pois commits feitos com GITHUB_TOKEN não disparam o build padrão de Pages. A primeira publicação pode ser acionada manualmente. Em outra hospedagem, execute o coletor antes de publicar ou agende-o no servidor; copiar o JSON uma única vez não ativa atualização diária.

Esta implementação local não habilita configurações no GitHub nem publica alterações automaticamente por conta própria.

### Testes

Execute `pwsh -File tests/noticias.test.ps1` para verificar RSS, CDATA, remoção de HTML, ordenação, duplicados, URLs e preservação do último arquivo válido em caso de falha. Execute também `node --test tests/liturgia.test.mjs`.
