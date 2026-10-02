import { readFile, writeFile, rename } from 'node:fs/promises';
import { normalizarLiturgia, urlLiturgia } from '../js/liturgia-api.js?v=20261002-mobile-2';
import { obterDataBrasilia } from '../js/liturgia.js?v=20261002-mobile-2';

const arquivo = new URL('../data/liturgia-auto.json', import.meta.url);
let liturgias = {};
try { liturgias = JSON.parse(await readFile(arquivo, 'utf8')).liturgias || {}; }
catch (erro) { if (erro.code !== 'ENOENT') throw erro; }
const hoje = obterDataBrasilia().iso;
let atualizadas = 0;
for (let i = 0; i < 7; i++) {
  const data = new Date(`${hoje}T12:00:00Z`);
  data.setUTCDate(data.getUTCDate() + i);
  const iso = data.toISOString().slice(0, 10);
  try {
    const r = await fetch(urlLiturgia(iso), { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const dados = await r.json();
    normalizarLiturgia(dados, iso);
    liturgias[iso] = dados;
    atualizadas++;
  } catch (erro) { console.warn(`Preservando cadastro de ${iso}: ${erro.message}`); }
}
if (!atualizadas) throw new Error('Nenhuma liturgia atualizada; arquivo anterior preservado.');
for (const iso of Object.keys(liturgias)) if (iso < hoje) delete liturgias[iso];
const temporario = new URL('../data/liturgia-auto.json.tmp', import.meta.url);
await writeFile(temporario, JSON.stringify({ atualizadoEm: new Date().toISOString(), liturgias }, null, 2) + '\n');
await rename(temporario, arquivo);
console.log(`${atualizadas} liturgias atualizadas.`);
