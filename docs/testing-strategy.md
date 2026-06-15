# 🏆 Estratégia de Testes: O Troféu de Testes

Abandonamos a abordagem teórica da Pirâmide de Testes e adotamos o modelo industrial do **Troféu de Testes (Testing Trophy)**. O objetivo primordial é maximizar a confiança de que o sistema funciona exatamente como em produção, otimizando o esforço de escrita de testes.

## 1. Distribuição do Troféu de Testes

### 1.1. Análise Estática (A Base do Troféu)
Garantida em tempo de compilação através dos Source Generators do Mediator e pelas validações rígidas do `CSharpier` e `Biome`. Impede código fora dos padrões sintáticos antes mesmo dos testes rodarem.

### 1.2. Testes de Unidade (~30% do esforço de escrita)
* **Foco:** Regras de negócio puras e isoladas, cálculos e estruturas sem efeito colateral externo (ex: comportamentos dos records primitivos de domínio `Result`/`Error` e regras isoladas de validadores).
* **Ferramentas:** xUnit, FluentAssertions, NSubstitute.
* **Regra:** Execução na casa dos milissegundos. Proibido tocar em banco de dados ou rede.

### 1.3. Testes de Integração (~50% a 60% do esforço de escrita - O Coração do Sistema)
Como a maior parte das falhas em sistemas IoT e CQRS reside na comunicação entre componentes, este é o bloco principal de proteção do Hub.
* **A Abordagem Real (Testcontainers):** Proibido o uso de simuladores em memória (In-Memory database). Os testes utilizam a biblioteca `Testcontainers.PostgreSql` para subir contêineres Docker reais e limpos do PostgreSQL e do TimescaleDB a cada bateria de testes.
* **Simulação de API Integrada:** Utilizamos `WebApplicationFactory` para instanciar a API em memória RAM, simulando requisições HTTP reais de ponta a ponta que atingem o banco de dados Docker real.

#### Cenários de Regressão Críticos Automatizados:
* **Cenário Soft Delete & Isolamento:** Validar se o disparo de um HTTP DELETE muda a flag `IsDeleted`, mas retorna `404 Not Found` em requisições de consulta subsequentes.
* **Cenário Reuso de Identificadores (Índice Parcial):** Validar se o sistema permite cadastrar um dispositivo com o mesmo `ExternalId` de um dispositivo previamente excluído logicamente.
* **Cenário Desvinculação de Cômodos:** Garantir que ao excluir logicamente um `Room`, os dispositivos associados a ele não sumam, mas tenham sua propriedade `RoomId` atualizada para `NULL` (cascata manual resolvida no Handler).
* **Cenário Persistência Temporal:** Garantir que a exclusão lógica de um dispositivo mantém intactos os milhões de registros históricos contidos em `DeviceTelemetryLogs`.

### 1.4. Testes de Ponta a Ponta (E2E) e UI (~10% do esforço)
Validam jornadas críticas do usuário do painel visual até o hardware através de automações de interface.