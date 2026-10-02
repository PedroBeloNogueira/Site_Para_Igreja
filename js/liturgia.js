import { buscarLiturgia } from './liturgia-api.js';

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

export function renderizarLeitura(dados, titulo, id) {
  if (!paragrafos(dados?.texto).length) return null;
  const card = criarCard(texto(dados.titulo) || titulo);
  card.dataset.leitura = id;
  if (texto(dados.referencia)) card.append(criar('p', 'reading-ref', texto(dados.referencia)));
  const corpo = criar('div', 'reading-text');
  adicionarTexto(corpo, dados.texto);
  card.append(corpo);
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
  aviso.textContent = publicado ? '' : 'Não foi possível obter as leituras deste dia.';
  aviso.hidden = publicado;
  aplicarCorLiturgica(publicado ? dados.corLiturgica : null);
  if (cards.dataset?.preview === 'true') {
    if (publicado) {
      const leitura = dados.evangelho;
      const trecho = Array.isArray(leitura?.texto) ? leitura.texto.join(' ') : texto(leitura?.texto);
      if (trecho) {
        const previa = criar('article', 'liturgy-preview');
        previa.append(criar('p', 'reading-heading', 'Evangelho'), criar('h3', '', texto(leitura.referencia)));
        previa.append(criar('blockquote', 'preview-excerpt', trecho.length > 320 ? trecho.slice(0, 320).replace(/\s+\S*$/, '') + '…' : trecho));
        cards.append(previa);
      }
    }
    return;
  }
  if (publicado) {
    const grupos = dados.gruposLeituras;
    const conteudos = grupos ? [
      ...grupos.primeiraLeitura.map((l, i) => renderizarLeitura(l, 'Primeira Leitura', `primeira-${i}`)),
      ...grupos.extras.map((l, i) => renderizarLeitura(l, 'Leitura adicional', `extra-${i}`)),
      ...grupos.salmo.map(l => renderizarSalmo(l)),
      ...grupos.segundaLeitura.map((l, i) => renderizarLeitura(l, 'Segunda Leitura', `segunda-${i}`)),
      ...grupos.evangelho.map((l, i) => renderizarLeitura(l, 'Evangelho', `evangelho-${i}`)),
    ] : [
      renderizarLeitura(dados.primeiraLeitura, 'Primeira Leitura', 'primeira'),
      renderizarSalmo(dados.salmo),
      renderizarLeitura(dados.segundaLeitura, 'Segunda Leitura', 'segunda'),
      renderizarLeitura(dados.evangelho, 'Evangelho', 'evangelho'),
    ];
    cards.append(...conteudos.filter(Boolean));
  }
}

let dataCarregada = null;
let requisicao = 0;
let temporizador;
let ultimaConsulta = 0;

export async function carregarLiturgiaDoDia(agora = new Date(), consultar = buscarLiturgia) {
  const data = obterDataBrasilia(agora);
  const versao = ++requisicao;
  const mudou = dataCarregada !== data.iso;
  dataCarregada = data.iso;
  ultimaConsulta = Date.now();
  if (mudou) {
    renderizarLiturgia(null, data);
    document.getElementById('liturgiaAviso').textContent = 'Consultando as leituras deste dia…';
  }
  try {
    const { liturgia } = await consultar(data.iso);
    if (versao !== requisicao) return;
    renderizarLiturgia(liturgia, data);
  } catch (erro) {
    if (versao === requisicao) {
      renderizarLiturgia(null, data);
      console.warn('Não foi possível carregar a liturgia.', erro);
    }
  }
}

export function agendarProximaAtualizacao() {
  clearTimeout(temporizador);
  const agora = new Date();
  temporizador = setTimeout(atualizarSeNecessario, proximaMeiaNoite(agora) - agora.getTime() + 50);
}

function atualizarSeNecessario() {
  if (obterDataBrasilia().iso !== dataCarregada || Date.now() - ultimaConsulta >= 15 * 60 * 1000) void carregarLiturgiaDoDia();
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
  setInterval(() => { if (!document.hidden) atualizarSeNecessario(); }, 15 * 60 * 1000);
}
