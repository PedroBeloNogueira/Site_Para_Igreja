import { obterDataBrasilia, proximaMeiaNoite } from './liturgia.js';

export function santoValido(santo, data) {
  if (!santo || santo.data !== data || typeof santo.nome !== 'string' || !santo.nome.trim()) return false;
  try {
    return [['imagem', '/source/files/'], ['url', '/reze-no-santuario/santo-do-dia']].every(([campo, prefixo]) => {
      const url = new URL(santo[campo]);
      return url.origin === 'https://www.a12.com' && !url.username && !url.password && url.pathname.startsWith(prefixo);
    });
  } catch { return false; }
}

const area = typeof document !== 'undefined' ? document.getElementById('saintTribute') : null;
if (area) {
  const foto = document.getElementById('saintImage');
  const nome = document.getElementById('saintName');
  const status = document.getElementById('saintStatus');
  const fonte = document.getElementById('saintSource');
  const credito = document.getElementById('saintCredit');
  let versao = 0;
  let timer;
  let ultimaData;
  let ultimaTentativa = 0;

  function limpar(data) {
    foto.hidden = true;
    foto.removeAttribute('src');
    foto.alt = '';
    fonte.hidden = true;
    fonte.removeAttribute('href');
    credito.textContent = '';
    nome.textContent = 'Homenagem do dia';
    status.textContent = 'A homenagem deste dia está sendo preparada.';
    document.getElementById('saintDate').textContent = data.extensa;
  }

  async function atualizar() {
    const data = obterDataBrasilia();
    if (data.iso === ultimaData && Date.now() - ultimaTentativa < 60000) return;
    const mudou = data.iso !== ultimaData;
    ultimaData = data.iso;
    ultimaTentativa = Date.now();
    const atual = ++versao;
    if (mudou) limpar(data);
    try {
      const resposta = await fetch(new URL('../data/santos.json', import.meta.url), { cache: 'no-store', signal: AbortSignal.timeout(12000) });
      if (!resposta.ok) throw new Error('Cadastro indisponível');
      const dados = await resposta.json();
      if (atual !== versao || obterDataBrasilia().iso !== data.iso) return;
      const santo = dados.santos?.[data.iso];
      if (!santoValido(santo, data.iso)) { limpar(data); return; }
      nome.textContent = santo.nome;
      status.textContent = typeof santo.resumo === 'string' && santo.resumo.trim()
        ? santo.resumo.trim() : 'Uma vida de fé para conhecer e levar à sua oração.';
      fonte.href = santo.url;
      fonte.hidden = false;
      credito.textContent = 'Imagem e calendário: A12 · Santuário de Aparecida';
      foto.alt = `Representação de ${santo.nome}`;
      foto.onerror = () => { foto.hidden = true; credito.textContent = ''; };
      foto.src = santo.imagem;
      foto.hidden = false;
    } catch {
      // O nome já carregado só permanece enquanto corresponde ao dia atual.
      if (atual === versao && mudou) limpar(data);
    }
  }

  function conferir() {
    void atualizar();
    clearTimeout(timer);
    timer = setTimeout(conferir, proximaMeiaNoite() - Date.now() + 50);
  }
  conferir();
  window.addEventListener('focus', conferir);
  window.addEventListener('pageshow', conferir);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) conferir(); });
  setInterval(() => { if (!document.hidden) void atualizar(); }, 15 * 60 * 1000);
}
