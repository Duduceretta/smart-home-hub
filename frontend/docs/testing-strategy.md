# 🏆 Estratégia de Testes: O Troféu de Testes no Front-end

Abandonamos a abordagem teórica da Pirâmide de Testes (que incentiva testes de unidade acoplados a detalhes de implementação) e adotamos o modelo industrial do **Troféu de Testes (Testing Trophy)**, popularizado por Kent C. Dodds. O objetivo primordial é maximizar a confiança de que o sistema funciona exatamente como o usuário espera, interagindo com o DOM real e simulando falhas de rede.

Este documento foca nas estratégias de validação da camada de Front-end (React/TypeScript).

---

## 1. Distribuição do Troféu de Testes no Front-end

### 1.1. Análise Estática (A Base do Troféu)

Garantida em tempo real pelo **TypeScript** (Strict Mode) e pelo **Biome** (Linter e Formatter). Bloqueia a subida de código com memory leaks (como o repasse de `index` em chaves do React), dependências faltantes em Hooks, ou tipagens soltas (`any`) antes mesmo dos testes rodarem.

### 1.2. Testes de Unidade (~20% do esforço de escrita)

- **Foco:** Regras lógicas puras e isoladas, funções utilitárias agnósticas e validações que não dependem do DOM (ex: conversão de UTC para fuso local, schemas do Zod, reducers do Zustand).
- **Ferramentas:** Vitest.
- **Regra:** Execução imediata. **Proibido** renderizar componentes React ou simular eventos de clique nesta camada.

```typescript
// ✅ Correto — teste de unidade puro
describe("formatUtcToLocal", () => {
    it("formatUtcToLocal_ValidUtcString_ShouldReturnLocalDateString", () => {
        const result = formatUtcToLocal("2026-06-09T01:24:00Z", "pt-BR");
        expect(result).toBe("09/06/2026, 22:24"); // UTC-3
    });
});
```

### 1.3. Testes de Integração (~80% do esforço de escrita — O Coração do Sistema)

Como o valor do front-end reside na interação do usuário e na resposta visual a dados assíncronos, este é o bloco principal de proteção do Hub.

- **A Abordagem Real (React Testing Library + MSW):** É estritamente **proibido** fazer mock de subcomponentes, da API `fetch` nativa ou do Axios. Utilizamos o **Mock Service Worker (MSW)** para interceptar requisições no nível da rede. Renderizamos a Feature inteira (com Providers de rotas e TanStack Query) e interagimos com ela exatamente como o usuário faria.
- **Isolamento de Estado:** Cada teste roda em um ambiente JSDOM limpo, com o cache do TanStack Query resetado a cada ciclo.

#### Cenários de Regressão Críticos Automatizados

| Cenário | Validação |
|---|---|
| **Optimistic UI (Soft Delete)** | Ao clicar em "Excluir Dispositivo", o item some imediatamente do DOM. O MSW simula um erro `500`. O item deve reaparecer na tela e um Toast de erro deve ser exibido. |
| **Proteção de Rota (Auth)** | Tentar acessar `/dashboard` com a store do Zustand vazia redireciona imediatamente para `/login` sem flicker na tela. |
| **Integração de Validação (Strict In)** | Clicar em "Salvar" com o formulário em branco dispara as regras do Zod. A tela exibe mensagens vermelhas sob os inputs sem realizar nenhuma requisição HTTP. |
| **Sincronia de Token (Interceptors)** | O MSW simula o disparo silencioso do Firebase `getIdToken()`. A requisição final interceptada possui o header `Authorization: Bearer <token_simulado>`. |

---

## 2. Padrões de Testes e Organização (O Padrão Ouro)

Para manter o mais alto rigor e garantir que a suíte de testes atue como **documentação viva** dos casos de uso visuais, adotamos as seguintes regras definitivas.

### 2.1. Nomenclatura (Padrão Roy Osherove)

O nome do teste deve contar a história visual e comportamental, dividida estritamente em três partes:

```
[NomeDoComponenteOuHook]_[CenarioDeTeste]_[ComportamentoEsperadoVisualmente]
```

| | Exemplo |
|---|---|
| ❌ **Ruim** | `TestLoginError` |
| ✅ **Perfeito** | `LoginForm_InvalidCredentials_ShouldShowErrorMessageUnderInputs` |

### 2.2. A Ordem Estrutural: O Padrão AAA

Dentro de cada método, a separação visual deve ser sagrada. O código deve conter uma **linha em branco obrigatória** entre cada fase.

1. **Arrange (Preparação):** Configuração dos handlers do MSW para o cenário específico (`200 OK` ou `422 Unprocessable Entity`), renderização do componente com `render()` injetando os Providers (`MemoryRouter`, `QueryClientProvider`).
2. **Act (Ação):** Interação com a tela simulando mouse e teclado reais. É **obrigatório** o uso do `@testing-library/user-event` v14+ (API assíncrona) em vez do `fireEvent` clássico — para simular a latência real de digitação e cliques físicos.
3. **Assert (Verificação):** Validações do estado final do DOM. **Não testamos estado interno** (se uma variável booleana mudou); testamos se a **tela mudou**.

```typescript
it("LoginForm_InvalidCredentials_ShouldShowErrorMessageUnderInputs", async () => {
    // Arrange
    server.use(
        http.post("/api/auth/login", () =>
            HttpResponse.json({ title: "Credenciais inválidas" }, { status: 422 })
        )
    );
    const user = userEvent.setup(); // v14+: setup antes de render
    render(<LoginForm />, { wrapper: AllProviders });

    // Act
    await user.type(screen.getByLabelText("Email"), "wrong@email.com");
    await user.type(screen.getByLabelText("Senha"), "wrongpassword");
    await user.click(screen.getByRole("button", { name: "Iniciar Sessão" }));

    // Assert
    expect(await screen.findByText("Email ou senha incorretos.")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument(); // loader sumiu
});
```

### 2.3. Foco de Cobertura (As Três Vias)

Em arquivos de teste referentes a Widgets ou componentes de Features (ex: `DeviceManager.test.tsx`), a ordem cronológica segue a usabilidade:

**1. O Happy Path (Caminho Feliz)**
O teste primordial de UI. Comprova que ao preencher o formulário corretamente e clicar em enviar (com o MSW devolvendo sucesso), o loader aparece brevemente, o componente limpa os campos e exibe a mensagem de sucesso.

**2. O Sad Path (Feedback de Validação Pura)**
Valida a barreira de Lazy Validation. O que acontece se o usuário submeter o formulário sem preencher os campos? O teste garante que o React Hook Form **não dispara** a requisição (o MSW não deve receber chamadas) e as mensagens do Zod aparecem no local exato.

```typescript
it("LoginForm_EmptySubmit_ShouldShowZodErrorsWithoutHttpCall", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginForm />, { wrapper: AllProviders });

    // Act — submete sem preencher nada
    await user.click(screen.getByRole("button", { name: "Iniciar Sessão" }));

    // Assert
    expect(screen.getByText("Email é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("Senha é obrigatória.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled(); // nenhuma requisição foi feita
});
```

**3. Os Edge Cases (Tratamento de Queda e ProblemDetails)**
Cenários de falha na rede ou na API. O MSW é configurado para devolver um `ProblemDetails` (`409 Conflict — Dispositivo já existe`). O teste garante que o utilitário do `core` parseou o erro, exibiu o Toast global correto, e destravou o botão de envio (removendo o `disabled`).