# Site da DWM (Developer With Mission)

Site portfólio estático da DWM: HTML, CSS e JS puros, sem build.

## Ver no computador

Abra `index.html` no navegador, ou rode um servidor simples:

```bash
cd dwm-site
python3 -m http.server 8080
```

e acesse http://localhost:8080.

## Estrutura

- `index.html`: seções (início, missão, serviços, projetos, FAQ, contato)
- `style.css`: cores da marca no topo (`:root`), roxo/rosa do logo
- `script.js`: menu do celular e botão copiar
- `assets/`: logo da DWM

## Para adicionar um projeto

Copie um bloco `<article class="card project">` dentro da seção `#projetos` e troque título, texto, tags e link.
