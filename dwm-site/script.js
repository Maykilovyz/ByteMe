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

// Logo animada do início: o bloco 3D "estica" e as letras surgem
(() => {
  const svg = document.getElementById('lg');
  if (!svg) return;
  const N1 = [622, 862], N2 = [992, 867], N3 = [995, 1237], E = [470, -470];
  const C0 = [1273, 593], C1 = [1042, 816], V = 1000;
  const el = id => document.getElementById(id);
  const pts = a => a.map(p => p.join(',')).join(' ');
  const clamp = x => Math.max(0, Math.min(1, x));
  const ease = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  let inicio = performance.now();

  function desenhar(t) {
    const r = 1 - t, ox = E[0] * r, oy = E[1] * r;
    const n1 = [N1[0] + ox, N1[1] + oy], n2 = [N2[0] + ox, N2[1] + oy], n3 = [N3[0] + ox, N3[1] + oy];
    const f1 = [N1[0] + E[0], N1[1] + E[1]], f2 = [N2[0] + E[0], N2[1] + E[1]], f3 = [N3[0] + E[0], N3[1] + E[1]];
    const topo = pts([n1, n2, f2, f1]), lado = pts([n2, n3, f3, f2]);
    el('lg-ptop').setAttribute('points', topo); el('lg-stop').setAttribute('points', topo);
    el('lg-pright').setAttribute('points', lado); el('lg-sright').setAttribute('points', lado);
    el('lg-move').setAttribute('transform', `translate(${ox} ${oy})`);
    const cx = C0[0] + (C1[0] - C0[0]) * t, cy = C0[1] + (C1[1] - C0[1]) * t;
    svg.setAttribute('viewBox', `${cx - V / 2} ${cy - V / 2} ${V} ${V}`);
  }
  function quadro(agora) {
    const ms = agora - inicio;
    desenhar(calmo ? 1 : ease(clamp((ms - 1300) / 1500)));
    let brilho = 0;
    if (!calmo && ms > 3200) {
      const c = (ms - 3200) % 5200;
      if (c < 1800) { const k = -150 + (c / 1800) * 1150; el('lg-sheen').setAttribute('gradientTransform', `translate(${k},${-k})`); brilho = 1; }
    }
    el('lg-stop').setAttribute('opacity', brilho); el('lg-sright').setAttribute('opacity', brilho);
    requestAnimationFrame(quadro);
  }
  function tocar() {
    svg.classList.remove('play'); void svg.getBoundingClientRect();
    svg.classList.add('play'); inicio = performance.now();
  }
  svg.addEventListener('click', tocar);
  tocar(); requestAnimationFrame(quadro);
})();
