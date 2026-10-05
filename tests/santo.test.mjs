import test from 'node:test';
import assert from 'node:assert/strict';
import { santoValido } from '../js/santo.js';
import { obterDataBrasilia } from '../js/liturgia.js';

const santo = {
  data: '2026-10-02', nome: 'Santos Anjos da Guarda',
  imagem: 'https://www.a12.com/source/files/originals/anjos.jpg',
  url: 'https://www.a12.com/reze-no-santuario/santo-do-dia?saint_id=702&day=2&month=10',
};

test('a homenagem só corresponde ao dia de Brasília e expira à meia-noite', () => {
  const antes = obterDataBrasilia(new Date('2026-10-03T02:59:59Z'));
  const depois = obterDataBrasilia(new Date('2026-10-03T03:00:00Z'));
  assert.equal(santoValido(santo, antes.iso), true);
  assert.equal(santoValido(santo, depois.iso), false);
});

test('cadastros ausentes e URLs fora da fonte não são exibidos', () => {
  for (const dados of [null, {}, { ...santo, nome: ' ' },
    { ...santo, imagem: 'javascript:alert(1)' },
    { ...santo, imagem: 'https://www.a12.com.evil.test/source/files/foto.jpg' },
    { ...santo, url: 'https://usuario@www.a12.com/reze-no-santuario/santo-do-dia' },
    { ...santo, imagem: 'https://www.a12.com:8080/source/files/foto.jpg' }]) {
    assert.equal(santoValido(dados, santo.data), false);
  }
});
