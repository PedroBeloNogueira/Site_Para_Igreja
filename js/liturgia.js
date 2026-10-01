import { mesesDisponiveis } from '../data/indice.js';

const FUSO = 'America/Sao_Paulo';
const formato = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit',
});
const formatoExtenso = new Intl.DateTimeFormat('pt-BR', {
  timeZone: FUSO, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});
const texto = valor => typeof valor === 'string' ? valor.trim() : '';
const paragrafos = valor => (Array.isArray(valor) ? valor : texto(valor).split(/\n\s*\n/))
  .map(texto).filter(Boolean);
const camposAprenda = {
  contextoHistorico: 'Contexto histórico', contextoReligioso: 'Contexto religioso',
  ligacaoComEvangelho: 'Ligação com o Evangelho', mensagemPrincipal: 'Mensagem principal',
  aplicacaoNaVida: 'Aplicação na vida',
};

export function obterDataBrasilia(agora = new Date()) {
  const partes = Object.fromEntries(formato.formatToParts(agora).map(p => [p.type, p.value]));
  return { ano: partes.year, mes: partes.month, dia: partes.day,
    iso: `${partes.year}-${partes.month}-${partes.day}`, extensa: formatoExtenso.format(agora) };
}

// Busca o primeiro milissegundo do próximo dia no fuso, sem assumir UTC-3 fixo.
export function proximaMeiaNoite(agora = new Date()) {
  const hoje = obterDataBrasilia(agora).iso;
  let inicio = agora.getTime();
  let fim = inicio + 48 * 60 * 60 * 1000;
  while (fim - inicio > 1) {
    const meio = Math.floor((inicio + fim) / 2);
    if (obterDataBrasilia(new Date(meio)).iso === hoje) inicio = meio;
    else fim = meio;
  }
  return fim;
}

function criar(tag, classe, conteudo) {
  const el = document.createElement(tag);
  if (classe) el.className = classe;
  if (conteudo) el.textContent = conteudo;
  return el;
}

function criarParagrafo(valor, classe = '') {
  const p = criar('p', classe);
  // Preserva as linhas cadastradas sem interpretar o conteúdo como HTML.
  texto(valor).split(/\r\n|\r|\n/).forEach((linha, indice) => {
    if (indice) p.append(criar('br'));
    p.append(document.createTextNode(linha));
  });
  return p;
}

function adicionarTexto(destino, valor) {
  for (const p of paragrafos(valor)) destino.append(criarParagrafo(p));
}

function criarCard(titulo) {
  const card = criar('div', 'reading-block');
  card.append(criar('h3', 'reading-heading', titulo));
  return card;
}

function renderizarAprenda(card, dados, id) {
  const campos = Object.entries(camposAprenda).filter(([chave]) => paragrafos(dados?.[chave]).length);
  if (!campos.length) return;
  const botao = criar('button', 'accordion-toggle');
  botao.type = 'button';
  botao.setAttribute('aria-expanded', 'false');
  botao.setAttribute('aria-controls', `aprenda-${id}`);
  botao.append(criar('span', 'chevron', '↓'), document.createTextNode(' Aprenda mais'));
  const painel = criar('div', 'accordion-panel');
  painel.id = `aprenda-${id}`;
  painel.hidden = true;
  const interior = criar('div', 'accordion-inner');
  for (const [chave, titulo] of campos) {
    const item = criar('div', 'aprenda-item');
    item.append(criar('h4', '', titulo));
    adicionarTexto(item, dados[chave]);
    interior.append(item);
  }
  painel.append(interior);
  botao.addEventListener('click', () => {
    const abrir = botao.getAttribute('aria-expanded') !== 'true';
    botao.setAttribute('aria-expanded', String(abrir));
    painel.hidden = !abrir;
    // Sem altura fixa: acompanha mudanças de fonte e largura da tela.
    painel.style.maxHeight = abrir ? 'none' : '0px';
  });
  card.append(botao, painel);
}

export function renderizarLeitura(dados, titulo, id) {
  if (!paragrafos(dados?.texto).length) return null;
  const card = criarCard(texto(dados.titulo) || titulo);
  card.dataset.leitura = id;
  if (texto(dados.referencia)) card.append(criar('p', 'reading-ref', texto(dados.referencia)));
  const corpo = criar('div', 'reading-text');
  adicionarTexto(corpo, dados.texto);
  card.append(corpo);
  renderizarAprenda(card, dados.aprendaMais, id);
  return card;
}

export function renderizarSalmo(dados) {
  if (!paragrafos(dados?.texto).length && !texto(dados?.refrao)) return null;
  const card = criarCard('Salmo Responsorial');
  card.dataset.leitura = 'salmo';
  if (texto(dados.referencia)) card.append(criar('p', 'reading-ref', texto(dados.referencia)));
  const corpo = criar('div', 'reading-text');
  if (texto(dados.refrao)) corpo.append(criarParagrafo(dados.refrao, 'salmo-refrao'));
  adicionarTexto(corpo, dados.texto);
  card.append(corpo);
  renderizarAprenda(card, dados.aprendaMais, 'salmo');
  return card;
}

export function renderizarHomilia(dados) {
  if (!paragrafos(dados?.texto).length) return null;
  const card = criarCard('Homilia');
  const corpo = criar('div', 'reading-text');
  adicionarTexto(corpo, dados.texto);
  card.append(corpo);
  return card;
}

export function renderizarVideo(dados) {
  const card = criarCard('Santa Missa de Hoje');
  const quadro = criar('div', 'video-frame');
  const id = texto(dados?.youtubeId);
  if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
    const iframe = criar('iframe');
    iframe.src = `https://www.youtube.com/embed/${id}`;
    iframe.title = 'Santa Missa de Hoje';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    quadro.append(iframe);
  } else {
    quadro.append(criar('p', 'video-aviso', 'A celebração em vídeo estará disponível em breve.'));
  }
  card.append(quadro);
  return card;
}

export function aplicarCorLiturgica(cor, raiz = document.getElementById('liturgia')) {
  const cores = { verde: '#4C6338', roxo: '#795496', branco: '#F5EFDC', vermelho: '#B74743', rosa: '#C97898' };
  const chave = texto(cor).toLowerCase();
  raiz.style.removeProperty('--cor-liturgica');
  delete raiz.dataset.corLiturgica;
  if (Object.hasOwn(cores, chave)) {
    raiz.style.setProperty('--cor-liturgica', cores[chave]);
    raiz.dataset.corLiturgica = chave;
  }
}

export function diaPublicado(dados, iso) {
  // Modelos e entradas vazias nunca são conteúdo publicado.
  return !!dados && dados.exemplo !== true && dados.publicado !== false &&
    (!dados.data || dados.data === iso) && !!texto(dados.celebracao);
}

export function renderizarLiturgia(dados, data = obterDataBrasilia()) {
  const cards = document.getElementById('liturgiaCards');
  cards.replaceChildren(); // Remove também o iframe e accordions do dia anterior.
  const publicado = diaPublicado(dados, data.iso);
  document.getElementById('liturgiaData').textContent = data.extensa;
  document.getElementById('liturgiaCelebracao').textContent = publicado
    ? texto(dados.celebracao) : 'Liturgia ainda não disponível';
  const tempo = document.getElementById('liturgiaTempo');
  tempo.textContent = publicado ? texto(dados.tempoLiturgico) : '';
  tempo.parentElement.hidden = !tempo.textContent;
  const aviso = document.getElementById('liturgiaAviso');
  aviso.textContent = publicado ? '' : 'O conteúdo deste dia ainda está sendo preparado.';
  aviso.hidden = publicado;
  aplicarCorLiturgica(publicado ? dados.corLiturgica : null);
  if (publicado) {
    const conteudos = [
      renderizarLeitura(dados.primeiraLeitura, 'Primeira Leitura', 'primeira'),
      renderizarSalmo(dados.salmo),
      renderizarLeitura(dados.segundaLeitura, 'Segunda Leitura', 'segunda'),
      renderizarLeitura(dados.evangelho, 'Evangelho', 'evangelho'),
      renderizarHomilia(dados.homilia),
    ];
    cards.append(...conteudos.filter(Boolean));
  }
  cards.append(renderizarVideo(publicado ? dados.video : null));
}

let dataCarregada = null;
let requisicao = 0;
let temporizador;

export async function carregarLiturgiaDoDia(agora = new Date()) {
  const data = obterDataBrasilia(agora);
  const versao = ++requisicao;
  dataCarregada = data.iso;
  renderizarLiturgia(null, data);
  const carregarMes = mesesDisponiveis[`${data.ano}-${data.mes}`];
  if (!carregarMes) return; // Sem request para meses não cadastrados.
  try {
    const { liturgias } = await carregarMes();
    if (versao === requisicao) renderizarLiturgia(liturgias?.[data.dia], data);
  } catch (erro) {
    // Arquivo inválido/indisponível conserva o estado vazio, nunca o dia anterior.
    if (versao === requisicao) console.warn('Não foi possível carregar o mês litúrgico.', erro);
  }
}

export function agendarProximaAtualizacao() {
  clearTimeout(temporizador);
  const agora = new Date();
  temporizador = setTimeout(atualizarSeNecessario, proximaMeiaNoite(agora) - agora.getTime() + 50);
}

function atualizarSeNecessario() {
  if (obterDataBrasilia().iso !== dataCarregada) void carregarLiturgiaDoDia();
  agendarProximaAtualizacao();
}

if (typeof document !== 'undefined' && document.getElementById('liturgiaCards')) {
  void carregarLiturgiaDoDia();
  agendarProximaAtualizacao();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') atualizarSeNecessario();
  });
  window.addEventListener('pageshow', atualizarSeNecessario);
  window.addEventListener('focus', atualizarSeNecessario);
}
