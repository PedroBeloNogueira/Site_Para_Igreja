// Substitua foto por 'assets/igreja.jpg' quando a foto estiver disponível.
// O nome e o QR Code devem corresponder aos dados confirmados no banco.
const apoio = {
  chave: '07.814.217/0024-70',
  copiaCola: '00020126360014br.gov.bcb.pix0114078142170024705204000053039865802BR5925PAROQUIA NOSSA SENHA DA A6007MAZAGAO62070503***63042E3B',
  destinatario: 'PAROQUIA NOSSA SENHA DA ASSUNÇÃO',
  foto: '',
  qrCode: 'assets/pix-comunidade.svg',
};

const modal = document.createElement('dialog');
modal.className = 'support-dialog';
modal.setAttribute('aria-labelledby', 'support-title');
modal.innerHTML = `
  <div class="support-panel">
    <button class="support-close" type="button" aria-label="Fechar janela de apoio">×</button>
    <div class="support-photo"><img hidden alt="Igreja da Paróquia Nossa Senhora da Assunção"><div class="support-photo-placeholder"><img src="assets/logo-paroquia.svg" alt=""><span>Paróquia Nossa Senhora da Assunção</span><small>Mazagão · AP</small></div></div>
    <div class="support-details">
      
      <h2 id="support-title">Apoiar a comunidade</h2>
      <p>Contribua pelo Pix com o valor que desejar.</p>
      <div class="support-payment">
        <img class="support-qr" hidden alt="QR Code para contribuição via Pix" width="200" height="200">
        <p class="support-qr-pending">QR Code em preparação.</p>
        <div><span class="support-label">Chave Pix · CNPJ</span><strong class="support-key"></strong><button class="support-copy" type="button">Copiar chave Pix</button><button class="support-copy-payload" type="button">Copiar Pix Copia e Cola</button><p class="support-copy-status" role="status" aria-live="polite"></p></div>
      </div>
      <p class="support-recipient"><span class="support-label">Destinatário</span><strong></strong></p>
      <p class="small-note">Antes de concluir, confira o destinatário no aplicativo do seu banco.</p>
    </div>
  </div>`;
document.body.append(modal);
modal.querySelector('.support-key').textContent = apoio.chave;
modal.querySelector('.support-recipient strong').textContent = apoio.destinatario || 'Nome bancário aguardando confirmação';
if (apoio.foto) {
  const foto = modal.querySelector('.support-photo > img');
  foto.src = apoio.foto;
  foto.hidden = false;
  foto.onerror = () => { foto.hidden = true; modal.querySelector('.support-photo-placeholder').hidden = false; };
  modal.querySelector('.support-photo-placeholder').hidden = true;
}
if (apoio.qrCode) {
  const qr = modal.querySelector('.support-qr');
  qr.src = apoio.qrCode;
  qr.hidden = false;
  modal.querySelector('.support-qr-pending').hidden = true;
}
let ultimoBotao;
document.querySelectorAll('[data-open-support]').forEach(botao => {
  botao.addEventListener('click', () => {
    ultimoBotao = botao;
    modal.querySelector('.support-copy-status').textContent = '';
    modal.showModal();
    document.body.classList.add('support-open');
    modal.querySelector('.support-close').focus();
  });
});
modal.querySelector('.support-close').addEventListener('click', () => modal.close());
modal.addEventListener('click', event => {
  if (event.target !== modal) return;
  const r = modal.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
});
modal.addEventListener('close', () => {
  document.body.classList.remove('support-open');
  ultimoBotao?.focus();
});
modal.querySelector('.support-copy').addEventListener('click', async () => {
  const status = modal.querySelector('.support-copy-status');
  try {
    await navigator.clipboard.writeText(apoio.chave.replace(/\D/g, ''));
    status.textContent = 'Chave Pix copiada!';
  } catch { status.textContent = 'Selecione e copie a chave exibida acima.'; }
});

modal.querySelector('.support-copy-payload').addEventListener('click', async () => {
 const status = modal.querySelector('.support-copy-status');
 try { await navigator.clipboard.writeText(apoio.copiaCola); status.textContent = 'Pix Copia e Cola copiado!'; }
 catch { status.textContent = 'Não foi possível copiar. Use a chave Pix exibida acima.'; }
});

if (location.hash === '#apoio') document.querySelector('[data-open-support]')?.click();
