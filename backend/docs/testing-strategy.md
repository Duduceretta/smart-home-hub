# 🏆 Estratégia de Testes: O Troféu de Testes

Abandonamos a abordagem teórica da Pirâmide de Testes e adotamos o modelo industrial do **Troféu de Testes (Testing Trophy)**. O objetivo primordial é maximizar a confiança de que o sistema funciona exatamente como em produção, otimizando o esforço de escrita de testes.

Este documento foca nas estratégias de validação da camada de Back-end (C#).

---

## 1. Distribuição do Troféu de Testes no Back-end

### 1.1. Análise Estática (A Base do Troféu)

Garantida em tempo de compilação através dos Source Generators do Mediator e pelas validações rígidas do `CSharpier`. Impede código fora dos padrões sintáticos antes mesmo dos testes rodarem.

### 1.2. Testes de Unidade (~30% do esforço de escrita)

- **Foco:** Regras de negócio puras e isoladas, cálculos e estruturas sem efeito colateral externo (ex: comportamentos dos records primitivos de domínio `Result`/`Error` e regras isoladas de validadores).
- **Ferramentas:** xUnit, FluentAssertions, NSubstitute.
- **Regra:** Execução na casa dos milissegundos. **Proibido** tocar em banco de dados ou rede.

### 1.3. Testes de Integração (~70% do esforço de escrita — O Coração do Sistema)

Como a maior parte das falhas em sistemas IoT e CQRS reside na comunicação entre componentes, este é o bloco principal de proteção do Hub.

- **A Abordagem Real (Testcontainers):** Proibido o uso de simuladores em memória (In-Memory database). Os testes utilizam a biblioteca `Testcontainers.PostgreSql` para subir contêineres Docker reais e limpos do PostgreSQL e do TimescaleDB a cada bateria de testes.
- **Simulação de API Integrada:** Utilizamos `WebApplicationFactory` para instanciar a API em memória RAM, simulando requisições HTTP reais de ponta a ponta que atingem o banco de dados Docker real.

#### Cenários de Regressão Críticos Automatizados

| Cenário | Validação |
|---|---|
| **Soft Delete & Isolamento** | O disparo de um `HTTP DELETE` muda a flag `IsDeleted`, mas retorna `404 Not Found` em requisições de consulta subsequentes. |
| **Reuso de Identificadores (Índice Parcial)** | O sistema permite cadastrar um dispositivo com o mesmo `ExternalId` de um dispositivo previamente excluído logicamente. |
| **Desvinculação de Cômodos** | Ao excluir logicamente um `Room`, os dispositivos associados não somem, mas têm sua propriedade `RoomId` atualizada para `NULL` (cascata manual resolvida no Handler). |
| **Persistência Temporal** | A exclusão lógica de um dispositivo mantém intactos os registros históricos contidos em `DeviceTelemetryLogs`. |

---

## 2. Padrões de Testes e Organização (O Padrão Ouro)

Para manter o mais alto rigor e garantir que a suíte de testes seja legível, manutenível e atue como **documentação viva** do sistema, adotamos as seguintes regras definitivas de estrutura, nomenclatura e foco.

### 2.1. Nomenclatura (Padrão Roy Osherove)

O nome do teste deve contar uma história inteira e clara, dividida estritamente em três partes:

```
[NomeDoMetodo]_[CenarioDeTeste]_[ComportamentoEsperado]
```

| | Exemplo |
|---|---|
| ❌ **Ruim** | `TestDeleteRoom` |
| ✅ **Perfeito** | `DeleteRoom_ShouldSoftDelete_AndHideFromCommonQueries` |

### 2.2. A Ordem Estrutural: O Padrão AAA

Dentro de cada método de teste, a separação visual deve ser sagrada. O código deve conter uma **linha em branco obrigatória** entre cada fase. Comentários `// Arrange` explícitos são opcionais, desde que os blocos sejam visivelmente separados.

1. **Arrange (Preparação):** Apenas configuração de variáveis estáticas, criação de mocks de dependências externas e inserção direta de estado no banco de dados.
2. **Act (Ação):** Estritamente **uma única linha de código** — o disparo do tiro contra o sistema (ex: `await Client.DeleteAsync(...)`).
3. **Assert (Verificação):** As validações do resultado retornado pela ação e a verificação do estado final no banco de dados (ignorando filtros globais para atestar a persistência real).

### 2.3. Foco de Cobertura (As Três Vias)

Em classes de teste referentes a Casos de Uso ou *Commands* (ex: `DeleteRoomTests`), a ordem cronológica de desenvolvimento e disposição dos métodos no arquivo deve fluir do cenário mais otimista para o mais adverso:

**1. O Happy Path (Caminho Feliz)**
O teste primordial. Comprova que se todas as condições forem perfeitas, a infraestrutura altera o banco com sucesso e a API retorna sucesso HTTP (ex: `200 OK` ou `204 NoContent`).

**2. O Sad Path (Regras de Domínio/Validação)**
Validar a barreira de entrada. O que acontece com inputs malformados (ex: um `Guid` de deleção vazio)? Foca em garantir que o FluentValidation intercepta a requisição e devolve `400 Bad Request` sem onerar o banco de dados.

**3. Os Edge Cases (Casos Extremos de Negócio)**
Cenários anômalos lógicos. Exemplo: se a entidade já estiver deletada logicamente (`IsDeleted = true`), o sistema deve devolver falha transacional ou erro de não encontrado?