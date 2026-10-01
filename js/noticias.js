function urlSegura(valor, prefixo) {
  try {
    const url = new URL(valor);
    return url.origin === 'https://www.vaticannews.va' && !url.username && !url.password && url.pathname.startsWith(prefixo) ? url.href : null;
  } catch { return null; }
}
function criar(tag, classe, texto) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (texto) el.textContent = texto;
  return el;
}
function link(texto, url, classe) {
  const el = criar('a', classe, texto);
  el.href = url;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  return el;
}
const formato = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
function artigo(noticia, destaque) {
  const el = criar('article', destaque ? 'news-lead' : 'news-brief');
  const imagem = urlSegura(noticia.imagem, '/content/dam/');
  if (imagem) {
    const figure = criar('figure', 'news-image');
    const fotoLink = link('', noticia.url);
    fotoLink.setAttribute('aria-label', `Ler: ${noticia.titulo}`);
    const img = criar('img');
    img.src = imagem;
    img.alt = '';
    img.width = 750; img.height = 422;
    img.loading = 'lazy'; img.decoding = 'async';
    img.addEventListener('error', () => figure.remove(), { once: true });
    fotoLink.append(img);
    figure.append(fotoLink, criar('figcaption', '', 'Imagem: Vatican News'));
    el.append(figure);
  }
  el.append(criar('p', 'news-category', destaque ? 'Em destaque' : 'Também no Vatican News'));
  const titulo = criar('h3');
  titulo.append(link(noticia.titulo, noticia.url));
  el.append(titulo);
  if (noticia.resumo) el.append(criar('p', 'news-summary', noticia.resumo));
  const meta = criar('p', 'news-meta', 'Vatican News · ');
  const time = criar('time', '', formato.format(new Date(noticia.publicadaEm)));
  time.dateTime = noticia.publicadaEm;
  meta.append(time);
  el.append(meta, link('Ler no Vatican News ↗', noticia.url, 'news-read'));
  return el;
}
let carregando = false;
let ultimaTentativa = 0;
let ultimaAtualizacao = null;
const grade = document.getElementById('noticiasGrid');
const status = document.getElementById('noticiasStatus');
async function atualizar() {
  if (carregando || Date.now() - ultimaTentativa < 60000) return;
  carregando = true;
  ultimaTentativa = Date.now();
  try {
    const resposta = await fetch(new URL('../data/noticias.json', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!resposta.ok) throw new Error('Arquivo de notícias indisponível');
    const dados = await resposta.json();
    const noticias = (Array.isArray(dados.noticias) ? dados.noticias : []).filter(n =>
      typeof n.titulo === 'string' && n.titulo.trim() && urlSegura(n.url, '/pt/') && Number.isFinite(Date.parse(n.publicadaEm))
    ).sort((a,b) => Date.parse(b.publicadaEm) - Date.parse(a.publicadaEm)).slice(0,3);
    if (!noticias.length || !Number.isFinite(Date.parse(dados.atualizadoEm))) throw new Error('Notícias inválidas');
    const secundarios = criar('div', 'news-briefs');
    noticias.slice(1).forEach(n => secundarios.append(artigo(n, false)));
    grade.replaceChildren(artigo(noticias[0], true), secundarios);
    ultimaAtualizacao = dados.atualizadoEm;
    const antiga = Date.now() - Date.parse(ultimaAtualizacao) > 36 * 60 * 60 * 1000;
    status.textContent = `${antiga ? 'Última atualização disponível' : 'Atualizado em'} ${formato.format(new Date(ultimaAtualizacao))}`;
  } catch {
    status.textContent = ultimaAtualizacao
      ? `Exibindo a atualização de ${formato.format(new Date(ultimaAtualizacao))}. Não foi possível consultar novidades agora.`
      : 'Notícias temporariamente indisponíveis. Acesse o Vatican News pelo link abaixo.';
  } finally { carregando = false; }
}
if (grade && status) {
  void atualizar();
  setInterval(() => { if (!document.hidden) void atualizar(); }, 15 * 60 * 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void atualizar(); });
}

