# Screenshots do tema

Gerados em 2026-09-23 com Playwright (Edge/Chromium headless, 1440 px de largura), com a API mockada pelos helpers de `e2e/support/`: 8 dispositivos, 2 alertas ativos e 3 eventos no feed.

| Arquivo | Conteúdo |
|---|---|
| `home-<preset>.png` | Tela Início (`/home`) em cada um dos 5 presets |
| `states-hover-focus-<preset>.png` | Tiles "Segurança & Alarme" e "Cenas": foco por teclado no modo "Noite" (`focus-visible:ring`) e hover em "Modo Cinema" |
| `dropdown-open-<preset>.png` | `DropdownMenu` aberto com item em foco (`focus:bg-accent`). O seletor de residência da Início só existe com > 1 projeto, então a captura usa o mesmo componente no menu "⋮" do card da Dashboard |
| `regression/before/*.png`, `regression/after/*.png` | As 8 rotas da sidebar no preset zinc, antes (`main`) e depois desta branch. `automations.png` usa o mock de `/api/devices` da suíte de automações: com o mock de dispositivos, a página cai no error boundary tanto no `main` quanto aqui (ver `../theme-followups.md` §8) |
