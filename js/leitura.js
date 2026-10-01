function toggleTheme(){
    const dark = document.documentElement.dataset.theme !== 'dark';
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    const button = document.getElementById('themeBtn');
    button.textContent = dark ? '☀' : '☾';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  }
  let fontScale = 1;
  function changeFont(delta){
    fontScale = Math.min(1.25, Math.max(0.9, fontScale + delta));
    document.documentElement.style.setProperty('--font-scale', fontScale);
  }

// Links para orações de apoio também abrem o conteúdo recolhido.
function abrirDetalheVinculado() {
  const alvo = document.getElementById(location.hash.slice(1));
  if (alvo?.tagName === 'DETAILS') alvo.open = true;
}
window.addEventListener('hashchange', abrirDetalheVinculado);
abrirDetalheVinculado();
