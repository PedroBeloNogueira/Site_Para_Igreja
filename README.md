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
