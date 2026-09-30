---
name: legacy-code-workflow
description: Usar ANTES de alterar código existente ou implementar feature/fix no Nexus Hub (backend ou frontend). Define a ordem obrigatória — reconhecimento com checagem de cobertura, teste de caracterização quando não há teste, TDD para lógica nova, bug com RED primeiro, escolha da camada de teste e backend antes de frontend.
---

# Workflow: Código Existente e Testes

## 1. Reconhecimento
- Ler o código atual, mapear dependências, origem dos dados e componentes órfãos antes de propor mudança.
- Mapear cobertura: quais testes já exercitam o trecho (unit, integração, Vitest, Playwright). Rodar só esses e confirmar que estão verdes antes de começar.
- Reportar o que encontrou antes de editar.

## 2. Teste de Caracterização (código sem cobertura)
- Trecho a alterar **sem teste**: escrever antes um teste que captura o comportamento ATUAL, mesmo que pareça errado. Objetivo: travar regressão, não validar corretude.
- Pergunta obrigatória: *"Existe teste cobrindo isso? Se não, escrever antes."*
- Comportamento atual parece bug: registrar no teste com comentário e perguntar antes de corrigir junto.

## 3. TDD (lógica nova)
Teste falhando → mínimo para passar → refatorar.

## 4. Bug (de review ou não)
Teste que reproduz → confirmar que falha **pelo motivo certo** → fix → verde. Nunca fix sem RED.

## 5. Camada de Teste

| O que muda | Teste |
|---|---|
| Lógica pura (regra da engine, parser Tuya, cálculo) | Unit, sem Docker |
| Query, migration, constraint, índice, hypertable | Integração com Testcontainers (skill `testcontainers`) |
| Wiring: DI, lifetimes, middleware, config, endpoint | Integração via `WebApplicationFactory<Program>` (composition root real) |
| Componente/hook React | Vitest + Testing Library + MSW — testar comportamento (render, interação, request feita), não snapshot |
| Fluxo de usuário ponta a ponta | Playwright |

- Escopo maior (feature, fluxo entre camadas): unit + integração juntos.
- **Teste nunca simplifica o mecanismo que está validando**: não mockar o que está sob teste, não montar à mão serviços que em produção vêm do container de DI.

## 6. Ordem Full-Stack
1. Travar o contrato backend (endpoint, DTO, payload, status codes) com teste de integração.
2. Frontend consome o contrato validado; handlers MSW espelham o contrato real.
- Exceção: tela construída com mock data centralizado por decisão explícita — trocar pelo contrato real quando ele existir.

## 7. Antes de Concluir
- Rodar os testes afetados com filtro, não a suíte inteira a cada passo.
- Informar: testes criados, o que cobrem, resultado.
