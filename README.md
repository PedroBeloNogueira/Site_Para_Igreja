# Paróquia Nossa Senhora da Assunção — site da paróquia

## Liturgia automática

A página inicial e a página de liturgia consultam a API pública Liturgia Diária v2, mantida por Dancrf: https://liturgia.up.railway.app/v2/. Documentação: https://github.com/Dancrf/liturgia-diaria/blob/main/docs/v2/README.md.

A consulta envia dia, mês e ano no horário de Brasília. A resposta deve corresponder à data solicitada e conter celebração, primeira leitura, salmo e Evangelho. Leituras alternativas e adicionais são preservadas na página completa. Segunda leitura aparece somente quando existe. Textos são exibidos sem executar HTML.

A API é a fonte principal. Em caso de falha, o site usa a resposta para a mesma data em `data/liturgia-auto.json` ou a última resposta salva no navegador. Nunca mostra a liturgia de ontem como a de hoje. Sem cópia do dia, informa a indisponibilidade. A data é conferida à meia-noite de Brasília, ao retornar à aba e a cada 15 minutos enquanto visível. Bloquear o armazenamento do navegador não impede a consulta à API.

Não é mais necessário preencher arquivos mensais nem cadastrar novos meses no índice. A API fornece leituras e cor litúrgica; homilias e explicações próprias não são geradas. A prévia mostra um trecho do primeiro Evangelho disponível.

### Cópia automática

Execute `node scripts/atualizar-liturgia.mjs` com Node 22 ou posterior para preparar hoje e os próximos seis dias. Respostas são validadas antes de gravar. Falhas parciais preservam as cópias existentes; falha total não altera o arquivo. Foram conferidas respostas reais da API de 2 a 8 de outubro de 2026.

O workflow `.github/workflows/noticias.yml` também executa o coletor. Publicar os arquivos e habilitar Actions ativa a manutenção da cópia. A consulta direta à API funciona ao carregar o site por HTTP. Falha em um coletor não impede a publicação dos dados preservados pelos demais. A configuração de GitHub Pages está descrita abaixo.

### Executar e testar

Use Live Server ou outro servidor HTTP local; módulos JavaScript não funcionam corretamente por `file://`. Publique todas as páginas, `styles.css`, `assets/`, `js/` e `data/`. Não há build ou dependências a instalar.

Execute `node --test tests/liturgia.test.mjs tests/liturgia-api.test.mjs tests/santo.test.mjs`. Os testes cobrem a data em Brasília, viradas do calendário, validação da API, cópias em falhas, resposta atrasada e conteúdo seguro.

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

## Páginas do site

A página inicial apresenta chamadas para os conteúdos. Publique também `liturgia.html`, `oracoes.html`, `noticias.html`, junto com os recursos compartilhados.

## Homenagem automática ao santo do dia

O início exibe a imagem e, abaixo, o nome do santo selecionado pelo calendário do A12 (Santuário de Aparecida), com crédito e link para a história. Quando há vários santos, usa a primeira homenagem com imagem do calendário. A imagem é carregada do servidor da fonte.

O arquivo local `data/santos.json` contém as homenagens por data. Já estão cadastrados os dias de 2 a 31 de outubro de 2026. Execute `pwsh -File scripts/atualizar-santos.ps1` para consultar hoje e os próximos sete dias; falhas preservam os cadastros anteriores. O workflow de notícias também executa esse coletor e publica todas as páginas. Para atualização contínua, publique as alterações no branch padrão e habilite Actions e a hospedagem conforme a seção acima.

O navegador troca a homenagem à meia-noite de Brasília, confere a data ao retornar à aba e consulta o JSON a cada 15 minutos enquanto visível. Sem cadastro válido para a data, mostra um aviso e não reutiliza o santo de ontem. Sem imagem acessível, mantém o nome e a história. Não é preciso cadastrar manualmente cada dia.

Validação: `node --test tests/liturgia.test.mjs tests/santo.test.mjs` e `pwsh -File tests/santos.test.ps1`.


## Identidade visual da paróquia

A logo original de Nossa Senhora da Assunção (Mazagão–AP) foi convertida de AI para `assets/logo-paroquia.svg`, preservando o desenho vetorial. O cabeçalho e o ícone das quatro páginas usam esse arquivo. A paleta fornecida está nas variáveis do CSS: dourados e bege nos detalhes, fundo claro #F2F2F2 e texto escuro. O tema escuro usa fundos castanhos e dourado claro, com preferência salva no navegador. As cores litúrgicas dos conteúdos continuam independentes da identidade da paróquia.

## Apoio à comunidade por Pix

Os botões de apoio abrem um dialog modal com QR Code estático, chave CNPJ e destinatário informado: PAROQUIA NOSSA SENHA DA ASSUNÇÃO. A cidade do QR é Mazagão. O QR usa valor livre e a chave 07814217002470, com checksum CRC16. O nome no payload é normalizado e limitado aos 25 caracteres previstos no BR Code; a janela mostra o nome completo informado. A conferência do cadastro bancário ocorre no aplicativo de pagamento.

O QR está em `assets/pix-comunidade.svg` e o payload em `assets/pix-comunidade.txt`. A configuração do modal está em `js/apoio.js`. Para a foto futura, coloque a imagem em `assets/igreja.jpg` e preencha `foto` com esse caminho. Até lá, a área mostra a logo da paróquia. Escape, botão de fechar e clique fora fecham a janela; o foco retorna ao botão de origem.

## Dados da paróquia

Paróquia Nossa Senhora da Assunção. Endereço: Trav. Pe. Antônio Valente Flexa, s/n - Bairro Central, Mazagão - AP, 68940-000. CNPJ: 07.814.217/0024-70. Horários informados das Missas: 07h00 e 18h00; dias da semana não informados. Site criado por Pedro Belo Nogueira. Informações exibidas no rodapé das quatro páginas principais.

## Conteúdo e manutenção

A navegação mantém quatro páginas e uma janela de apoio. Foram removidos os cadastros mensais antigos, modelos e índice manual, a antiga página de contribuição, rótulos decorativos, numeração de seções, reflexão genérica e o aviso de vídeo sem integração. As leituras e sua numeração bíblica, a formação, o Pix, créditos e estados de erro permanecem.

## Orações individuais

`oracoes.html` é o catálogo com caixas de acesso. Pai Nosso, Ave Maria, Creio em Deus Pai, Glória ao Pai, Salve Rainha e Ó meu Jesus têm páginas individuais com o texto completo. Os guias do terço e da Missa também têm páginas próprias. Todos os HTML da raiz são incluídos na publicação do GitHub Actions.
