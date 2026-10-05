import test from 'node:test';
import assert from 'node:assert/strict';
import * as liturgia from '../js/liturgia.js';

test('Brasília independe do fuso do dispositivo e respeita viradas do calendário', () => {
  const anterior = process.env.TZ;
  try {
    for (const fuso of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = fuso;
      for (const [instante, dia] of [
        ['2026-09-08T02:59:59.999Z', '2026-09-07'],
        ['2026-09-08T03:00:00Z', '2026-09-08'],
        ['2026-10-01T02:59:59Z', '2026-09-30'],
        ['2026-10-01T03:00:00Z', '2026-10-01'],
        ['2027-01-01T03:00:00Z', '2027-01-01'],
        ['2028-02-29T03:00:00Z', '2028-02-29'],
        ['2028-03-01T02:59:59Z', '2028-02-29'],
        ['2027-03-01T02:59:59Z', '2027-02-28'],
      ]) assert.equal(liturgia.obterDataBrasilia(new Date(instante)).iso, dia);
    }
  } finally {
    if (anterior === undefined) delete process.env.TZ;
    else process.env.TZ = anterior;
  }
});

test('próxima meia-noite cobre meses de 28, 29, 30, 31 dias e ano novo', () => {
  for (const [inicio, fim] of [
    ['2027-02-28', '2027-03-01'], ['2028-02-28', '2028-02-29'],
    ['2028-02-29', '2028-03-01'], ['2026-09-30', '2026-10-01'],
    ['2026-10-31', '2026-11-01'], ['2026-12-31', '2027-01-01'],
  ]) assert.equal(new Date(liturgia.proximaMeiaNoite(new Date(`${inicio}T15:00:00Z`))).toISOString(), `${fim}T03:00:00.000Z`);
});

test('modelos, rascunhos, datas divergentes e objetos vazios não são publicados', () => {
  for (const valor of [null, {}, { celebracao: ' ' }, { celebracao: 'Exemplo', exemplo: true },
    { celebracao: 'Teste', publicado: false }, { celebracao: 'Teste', data: '2026-09-02' }]) {
    assert.equal(liturgia.diaPublicado(valor, '2026-09-01'), false);
  }
  assert.equal(liturgia.diaPublicado({ celebracao: 'Cadastro' }, '2026-09-01'), true);
});

// DOM mínimo para verificar texto, árvore, estado e eventos sem dependências.
class Elemento {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.style = { setProperty(k,v) { this[k] = v; }, removeProperty(k) { delete this[k]; } }; }
  append(...filhos) { for (const f of filhos) { this.children.push(f); f.parentElement = this; } }
  replaceChildren(...filhos) { this.children = []; this.append(...filhos); }
  set textContent(v) { this.children = []; this.content = v; }
  get textContent() { return (this.content || '') + this.children.map(f => f.textContent).join(''); }
  setAttribute(k,v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  addEventListener(k,fn) { this.events[k] = fn; }
}
const ids = Object.fromEntries(['liturgia', 'liturgiaCards', 'liturgiaData', 'liturgiaCelebracao', 'liturgiaTempo', 'liturgiaAviso'].map(id => [id, new Elemento('div')]));
ids.liturgiaTempo.parentElement = new Elemento('div');
globalThis.document = { createElement: tag => new Elemento(tag), createTextNode: v => { const e = new Elemento('#text'); e.textContent = v; return e; }, getElementById: id => ids[id] };
const todos = el => [el, ...el.children.flatMap(todos)];

test('leituras vazias ficam ocultas e texto é exibido sem executar HTML', () => {
  assert.equal(liturgia.renderizarLeitura(null, 'Leitura', 'x'), null);
  assert.equal(liturgia.renderizarLeitura({ texto: ' ' }, 'Leitura', 'x'), null);

  assert.equal(liturgia.renderizarSalmo({}), null);
  assert.ok(liturgia.renderizarSalmo({ refrao: 'Refrão de teste' }));
  const card = liturgia.renderizarLeitura({ texto: '<img src=x onerror=alert(1)>\n\nSegundo parágrafo', aprendaMais: { mensagemPrincipal: 'Teste', contextoHistorico: '' } }, 'Leitura', 'x');
  assert.equal(todos(card).some(e => e.tagName === 'img'), false);
  assert.ok(card.textContent.includes('<img src=x onerror=alert(1)>'));
});


test('troca remove leituras e cor e dias ausentes não reaproveitam dados', async () => {
  const data = liturgia.obterDataBrasilia(new Date('2026-09-01T15:00:00Z'));
  liturgia.renderizarLiturgia({ celebracao: 'Teste', corLiturgica: 'roxo', primeiraLeitura: { texto: 'Texto teste' }, segundaLeitura: null, video: { youtubeId: 'Abc_123-XYZ' } }, data);
  assert.equal(ids.liturgia.dataset.corLiturgica, 'roxo');
  assert.equal(todos(ids.liturgiaCards).filter(e => e.tagName === 'iframe').length, 0);
  await liturgia.carregarLiturgiaDoDia(new Date('2026-09-02T15:00:00Z'), async () => ({liturgia: null}));
  assert.equal(ids.liturgiaCelebracao.textContent, 'Liturgia ainda não disponível');
  assert.equal(todos(ids.liturgiaCards).filter(e => e.tagName === 'iframe').length, 0);
  assert.equal(ids.liturgia.dataset.corLiturgica, undefined);
  await liturgia.carregarLiturgiaDoDia(new Date('2030-01-01T15:00:00Z'), async () => ({liturgia: null}));
  assert.equal(ids.liturgiaCards.children.length, 0);
});

test('resposta atrasada de outro mês não sobrescreve o dia mais recente', async () => {
  let resolver;
  const consultar = () => new Promise(resolve => { resolver = resolve; });
  const pendente = liturgia.carregarLiturgiaDoDia(new Date('2040-01-31T15:00:00Z'), consultar);
  await liturgia.carregarLiturgiaDoDia(new Date('2040-02-01T15:00:00Z'), async () => ({liturgia: null}));
  resolver({ liturgia: {data: '2040-01-31', celebracao: 'Antigo'} });
  await pendente;
  assert.equal(ids.liturgiaCelebracao.textContent, 'Liturgia ainda não disponível');
  assert.ok(ids.liturgiaData.textContent.includes('fevereiro'));

});

test('prévia destaca o Evangelho e fica vazia sem leitura publicada', () => {
  ids.liturgiaCards.dataset.preview = 'true';
  const data = liturgia.obterDataBrasilia(new Date('2026-10-02T15:00:00Z'));
  try {
    const dados = { celebracao: 'Celebração de teste', evangelho: { referencia: 'Referência de teste', texto: 'Palavra para meditar.' } };
    liturgia.renderizarLiturgia(dados, data);
    assert.equal(todos(ids.liturgiaCards).filter(e => e.tagName === 'blockquote').length, 1);
    assert.equal(todos(ids.liturgiaCards).some(e => e.tagName === 'iframe'), false);
    liturgia.renderizarLiturgia(dados, data);
    assert.ok(ids.liturgiaCards.textContent.includes('Referência de teste'));
    liturgia.renderizarLiturgia(null, data);
    assert.equal(ids.liturgiaCards.children.length, 0);
  } finally { delete ids.liturgiaCards.dataset.preview; }
});
