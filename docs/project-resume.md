# 🏗️ Arquitetura do SmartHomeHub

## 💎 1. SmartHomeHub.Domain

**O que é:** O núcleo central e a camada mais isolada da aplicação. Ela representa o "coração" do negócio.

**O que faz:** Contém a definição das regras de negócio puras, entidades estruturais (`User`, `Room`, `Device`, `DeviceTelemetryLog`), Enums e os primitivos de domínio (como as classes base de `Result` e `Error` do padrão de tratamento de falhas).

**Para que serve no projeto:** Garante que o modelo de negócio seja completamente independente de qualquer tecnologia externa. Esta camada não possui nenhuma dependência de pacotes de banco de dados, frameworks ou bibliotecas externas — é puro C#. Se decidirmos trocar o Entity Framework por outra ferramenta no futuro, o domínio permanecerá intacto.

---

## 🚀 2. SmartHomeHub.Application

**O que é:** O orquestrador das intenções do usuário. Ela dita o fluxo das regras de caso de uso do sistema.

**O que faz:** Implementa o padrão CQRS. Aqui vivem todos os `Commands`, `Queries`, `Validators` (FluentValidation) e os `Handlers` responsáveis por executar as ações (ex: `CreateRoomCommandHandler`, `GetDevicesQueryHandler`). Também hospeda os interceptadores de alta performance (Pipeline Behaviors como o `ValidationBehavior` e o `LoggingBehavior`).

**Para que serve no projeto:** Conecta os canais de entrada (como requisições da API) às regras do domínio e dita o comportamento dos dados. Depende estritamente e apenas da camada `Domain`. Para máxima performance e alocação zero de memória em tempo de execução, utiliza o pacote **Mediator** via Source Generators.

---

## 🛠️ 3. SmartHomeHub.Infrastructure

**O que é:** A camada de encanamento técnico e suporte tecnológico com o mundo exterior.

**O que faz:** Implementa tudo aquilo que depende de um agente externo para funcionar. Aqui residem o contexto do Entity Framework Core (`AppDbContext`), as classes de mapeamento e configuração de tabelas (`DeviceConfiguration`, `DeviceTelemetryLogConfiguration`), as migrações de banco de dados e as conexões concretas com o PostgreSQL e tabelas do TimescaleDB.

**Para que serve no projeto:** Resolve as interfaces definidas pelas camadas internas. Quando a aplicação precisa persistir algo no banco, é a Infraestrutura que traduz os comandos em SQL, gerencia índices únicos e aplica os filtros globais de segurança (como o isolamento de Soft Delete).

---

## 🌐 4. SmartHomeHub.Api

**O que é:** O ponto de entrada da aplicação (Host ou Composition Root). O único projeto executável diretamente do ecossistema Web.

**O que faz:** Expõe as Minimal APIs para o mundo exterior. É responsável por configurar o pipeline de requisições HTTP, middlewares globais (como o `GlobalExceptionHandler` e o gerenciador de autenticação do Firebase JWT), registrar as coleções de endpoints no Scalar e inicializar o mecanismo de logs estruturados do Serilog. Também hospeda serviços em background de longa duração, como o `MqttListenerWorker`.

**Para que serve no projeto:** É a "cola" da aplicação. Referencia todos os outros projetos (`Application`, `Infrastructure`) com o único propósito de configurar o contêiner de injeção de dependência e dar o boot no servidor. Traduz as requisições HTTP recebidas pelo Scalar em objetos internos do Mediator para serem processados de forma limpa.

---

## 🎯 5. SmartHomeHub.UnitTests

**O que é:** A suíte de testes rápidos e de isolamento de lógica pura.

**O que faz:** Testa pequenos blocos lógicos de código de forma isolada, sem tocar em bancos de dados ou redes. Valida comportamentos síncronos dos Handlers, invariantes de domínio e regras de validação do FluentValidation através de simulações rápidas (Mocks/Fakes).

**Para que serve no projeto:** Garante que alterações em uma regra de negócio ou formato de validação não quebrem outras partes do sistema. Por rodar inteiramente em memória e executar em milissegundos, fornece feedback instantâneo de qualidade de código durante o desenvolvimento.

---

## 🐳 6. SmartHomeHub.IntegrationTests

**O que é:** A suíte de testes de ponta a ponta (End-to-End), focada em cenários reais de integração.

**O que faz:** Testa o funcionamento integrado do sistema simulando o ambiente de produção. Utiliza a estratégia do Troféu de Testes através da biblioteca **Testcontainers**, que levanta contêineres reais descartáveis do Docker (PostgreSQL, TimescaleDB, Mosquitto MQTT Broker) durante a execução dos testes.

**Para que serve no projeto:** Garante a blindagem total da arquitetura. Dispara requisições HTTP reais contra os endpoints protegidos, passa pela validação do Firebase, navega pelo Mediator, executa os comandos no banco de dados físico e valida se as tabelas temporais e regras de multi-tenant estão se comportando corretamente sob condições reais de infraestrutura.