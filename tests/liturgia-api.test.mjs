import test from 'node:test';
import assert from 'node:assert/strict';
import { buscarLiturgia, normalizarLiturgia, urlLiturgia } from '../js/liturgia-api.js';

function resposta() {
  const leitura = { titulo: 'Leitura de teste', referencia: 'Referência de teste', texto: 'Conteúdo de teste.' };
  return { data: '02/10/2026', liturgia: 'Celebração de teste', cor: 'Branco', leituras: {
    primeiraLeitura: [leitura], salmo: [{ ...leitura, refrao: 'Refrão de teste' }],
    segundaLeitura: [], evangelho: [leitura], extras: [],
  } };
}
const http = dados => ({ ok: true, json: async () => dados });
const local = { getItem: () => null, setItem() {} };

test('consulta data explícita e preserva alternativas, extras e segunda leitura ausente', () => {
  const url = new URL(urlLiturgia('2026-10-02'));
  assert.equal(url.searchParams.get('ano'), '2026');
  assert.equal(url.searchParams.get('dia'), '02');
  const dados = resposta();
  dados.leituras.evangelho.push({ texto: 'Forma alternativa', referencia: 'Outra referência' });
  dados.leituras.extras.push({ texto: 'Leitura adicional' });
  const normal = normalizarLiturgia(dados, '2026-10-02');
  assert.equal(normal.corLiturgica, 'branco');
  assert.equal(normal.segundaLeitura, null);
  assert.equal(normal.gruposLeituras.evangelho.length, 2);
  assert.equal(normal.gruposLeituras.extras.length, 1);
});

test('data divergente e respostas incompletas não viram conteúdo publicado', () => {
  assert.throws(() => normalizarLiturgia(resposta(), '2026-10-03'));
  for (const campo of ['primeiraLeitura', 'salmo', 'evangelho']) {
    const dados = resposta(); dados.leituras[campo] = [];
    assert.throws(() => normalizarLiturgia(dados, '2026-10-02'));
  }
  assert.throws(() => normalizarLiturgia({ error: 'Falha' }, '2026-10-02'));
});

test('API prevalece sobre cópia e salva resposta mesmo com falha de armazenamento', async () => {
  const fetch = async url => String(url).includes('liturgia-auto') ? http({ liturgias: {} }) : http(resposta());
  const storage = { setItem() { throw new Error('Sem espaço'); } };
  const dados = await buscarLiturgia('2026-10-02', fetch, storage);
  assert.equal(dados.origem, 'api');
  assert.equal(dados.liturgia.celebracao, 'Celebração de teste');
});

test('falha de rede usa cópia do dia e nunca a leitura de ontem', async () => {
  const fetch = async url => {
    if (String(url).includes('liturgia-auto')) return http({ liturgias: { '2026-10-02': resposta() } });
    throw new Error('Sem rede');
  };
  assert.equal((await buscarLiturgia('2026-10-02', fetch, local)).origem, 'copia');
  assert.equal((await buscarLiturgia('2026-10-03', fetch, local)).liturgia, null);
});

test('cópia do navegador atende apenas à data exata e HTTP inválido é rejeitado', async () => {
  const fetch = async () => ({ ok: false });
  const storage = { getItem: () => JSON.stringify(resposta()) };
  assert.equal((await buscarLiturgia('2026-10-02', fetch, storage)).origem, 'copia');
  assert.equal((await buscarLiturgia('2026-10-03', fetch, storage)).origem, 'indisponivel');
});
