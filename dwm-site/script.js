// Menu no celular
const toggle = document.querySelector('.menu-toggle');
const menu = document.getElementById('menu');
toggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  toggle.setAttribute('aria-expanded', open);
});
menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));

// Botão "copiar" do terminal
document.querySelectorAll('.copy').forEach(btn => {
  btn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(btn.dataset.copy); btn.textContent = 'copiado!'; }
    catch { btn.textContent = 'erro'; }
    setTimeout(() => (btn.textContent = 'copiar'), 1500);
  });
});

// Ano no rodapé
document.getElementById('ano').textContent = new Date().getFullYear();
