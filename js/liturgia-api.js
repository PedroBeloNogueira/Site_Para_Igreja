export const API_LITURGIA = 'https://liturgia.up.railway.app/v2/';
const texto = v => typeof v === 'string' ? v.trim() : '';

export function normalizarLiturgia(dados, iso) {
  const [ano, mes, dia] = iso.split('-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || dados?.data !== `${dia}/${mes}/${ano}` || !texto(dados.liturgia)) {
    throw new Error('A API não retornou a data solicitada.');
  }
  const grupos = {};
  for (const campo of ['primeiraLeitura', 'salmo', 'segundaLeitura', 'evangelho', 'extras']) {
    if (!Array.isArray(dados.leituras?.[campo])) throw new Error('Leituras inválidas.');
    grupos[campo] = dados.leituras[campo].map(l => ({
      titulo: texto(l?.titulo), referencia: texto(l?.referencia), texto: texto(l?.texto), refrao: texto(l?.refrao),
    })).filter(l => l.texto || (campo === 'salmo' && l.refrao));
  }
  if (!grupos.evangelho.length || !grupos.primeiraLeitura.length || !grupos.salmo.length) throw new Error('Liturgia incompleta.');
  return { data: iso, celebracao: texto(dados.liturgia), corLiturgica: texto(dados.cor).toLowerCase(),
    primeiraLeitura: grupos.primeiraLeitura[0], salmo: grupos.salmo[0],
    segundaLeitura: grupos.segundaLeitura[0] || null, evangelho: grupos.evangelho[0],
    gruposLeituras: grupos, fonte: API_LITURGIA };
}

export function urlLiturgia(iso) {
  const [ano, mes, dia] = iso.split('-');
  const url = new URL(API_LITURGIA);
  url.search = new URLSearchParams({ dia, mes, ano });
  return url.href;
}

export async function buscarLiturgia(iso, fetchImpl = globalThis.fetch, storage) {
  if (storage === undefined) {
    try { storage = globalThis.localStorage; } catch { storage = null; }
  }
  // A cópia local contém respostas originais: recebe a mesma validação da API.
  const copia = (async () => {
    const r = await fetchImpl(new URL('../data/liturgia-auto.json', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!r.ok) throw new Error('Cópia indisponível.');
    const dados = await r.json();
    return normalizarLiturgia(dados.liturgias?.[iso], iso);
  })();
  // Registra imediatamente o tratamento para uma falha da cópia não ficar sem handler.
  const copiaSegura = copia.catch(() => null);
  try {
    const r = await fetchImpl(urlLiturgia(iso), { cache: 'no-store', signal: AbortSignal.timeout(12000) });
    if (!r.ok) throw new Error('API indisponível.');
    const original = await r.json();
    const liturgia = normalizarLiturgia(original, iso);
    try { storage?.setItem('emaus-liturgia', JSON.stringify(original)); } catch {}
    return { liturgia, origem: 'api' };
  } catch {
    const local = await copiaSegura;
    if (local) return { liturgia: local, origem: 'copia' };
    try {
      const original = JSON.parse(storage?.getItem('emaus-liturgia') || 'null');
      return { liturgia: normalizarLiturgia(original, iso), origem: 'copia' };
    } catch { return { liturgia: null, origem: 'indisponivel' }; }
  }
}
