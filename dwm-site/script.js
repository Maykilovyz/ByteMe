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

const calmo = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Terminal digitando
const term = document.getElementById('term');
const comandos = ['dwm start --missao "mudar o jogo"', 'dwm build --com-proposito', 'dwm deploy --impacto real'];
if (calmo) { term.textContent = comandos[0]; }
else {
  let c = 0, i = 0, apagando = false;
  (function digitar() {
    const txt = comandos[c];
    term.textContent = txt.slice(0, i);
    if (!apagando && i < txt.length) { i++; setTimeout(digitar, 60); }
    else if (!apagando) { apagando = true; setTimeout(digitar, 1800); }
    else if (i > 0) { i--; setTimeout(digitar, 25); }
    else { apagando = false; c = (c + 1) % comandos.length; setTimeout(digitar, 300); }
  })();
}
// O botão copiar copia o comando que está na tela
document.querySelector('.copy').addEventListener('click', e => { e.currentTarget.dataset.copy = term.textContent; }, true);

// Elementos aparecem ao rolar
const alvos = document.querySelectorAll('.section h2, .big, .values li, .card, .faq details, .contact .lead, .contact .cta, .footer > *');
alvos.forEach(el => {
  el.classList.add('reveal');
  const irmaos = [...el.parentElement.children];
  el.style.setProperty('--d', (irmaos.indexOf(el) % 6) * 0.08 + 's');
});
const obs = new IntersectionObserver(entradas => entradas.forEach(e => {
  if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
}), { threshold: 0.15 });
alvos.forEach(el => obs.observe(el));

// Luz seguindo o mouse nos cards
document.querySelectorAll('.card').forEach(card => card.addEventListener('mousemove', e => {
  const r = card.getBoundingClientRect();
  card.style.setProperty('--mx', e.clientX - r.left + 'px');
  card.style.setProperty('--my', e.clientY - r.top + 'px');
}));

// Barra de progresso e sombra do menu
const barra = document.querySelector('.progress');
const nav = document.querySelector('.nav');
addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - innerHeight;
  barra.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`;
  nav.classList.toggle('scrolled', scrollY > 10);
}, { passive: true });
