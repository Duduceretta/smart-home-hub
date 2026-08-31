---
name: screen-builder
description: Guia a criação de novas telas no frontend seguindo Feature-Sliced Design e validação visual via Playwright.
---

# Screen Builder Directives
- **Estrutura FSD:** Crie contêineres de rota puros em `src/pages/[feature]/` e isole a lógica dentro de `src/features/[feature]/` (`components/`, `hooks/`, `store/`, `types/`, `api/`).
- **Validação com Playwright:** Após gerar a tela, execute `npm run test:e2e` ou dispare um script de snapshot para validar se o DOM carregou sem erros de console e sem quebras de layout.
- **Prevenção de Layout Shift (CLS):** Reserve alturas mínimas para áreas com carregamento dinâmico e use skeletons estruturais espelhando o layout final.
- **Scroll e Viewport:** Garanta contêineres pai com `h-full min-h-0 overflow-hidden` e listas internas com a utilidade `.scrollbar-thin`.