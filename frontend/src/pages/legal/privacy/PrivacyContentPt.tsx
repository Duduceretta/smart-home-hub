export function PrivacyContentPt() {
	return (
		<>
			{/* 1. Responsável pelo Tratamento */}
			<section id="responsavel" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					1. Identificação do Controlador e Responsável
				</h2>
				<p>
					Esta Política de Privacidade aplica-se à plataforma{" "}
					<strong>Nexus Hub</strong> (disponível em{" "}
					<span className="font-mono text-xs text-foreground">
						nexushub.page
					</span>
					), um ecossistema de automação residencial inteligente com arquitetura
					prioritariamente local (<em>Local-First</em>).
				</p>
				<p>
					O controlador e responsável pelo tratamento dos dados pessoais
					coletados pela plataforma é <strong>Eduardo</strong>, idealizador e
					mantenedor do Nexus Hub. O projeto encontra-se em estágio de evolução
					contínua originado como Trabalho de Conclusão de Curso (TCC) em
					Engenharia de Software / Computação, operando como projeto individual
					sem registro de pessoa jurídica (CNPJ) formal no momento.
				</p>
				<p>
					Para quaisquer esclarecimentos ou solicitações relativas à privacidade
					e proteção de seus dados, o canal oficial direto de contato é:{" "}
					<a
						href="mailto:duduceretta@gmail.com"
						className="font-mono text-xs font-semibold text-primary underline underline-offset-2 hover:opacity-80"
					>
						duduceretta@gmail.com
					</a>
					.
				</p>
			</section>

			{/* 2. Dados Coletados */}
			<section id="dados-coletados" className="space-y-4 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					2. Dados Pessoais e Informações Coletadas
				</h2>
				<p>
					Para viabilizar a orquestração e o monitoramento inteligente de
					residências, o Nexus Hub coleta estritamente as categorias de dados
					necessárias para o fornecimento dos serviços:
				</p>

				<div className="space-y-4">
					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							a) Dados Cadastrais e de Autenticação
						</h3>
						<p className="text-sm">
							Nome completo, endereço de e-mail e identificador único de usuário
							(UID), gerenciados através do provedor de identidade{" "}
							<strong>Firebase Authentication</strong> (Google). Não armazenamos
							nem temos acesso à sua senha em texto puro.
						</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							b) Topologia Residencial, Dispositivos e Automações
						</h3>
						<p className="text-sm">
							Nomes atribuídos aos cômodos (ambientes), agrupamentos lógicos de
							aparelhos, modelos e marcas de dispositivos cadastrados, endereços
							IP e MAC locais utilizados na rede doméstica para comunicação
							direta, e regras condicionais/agendamentos criados para automação.
						</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							c) Telemetria Operacional e Histórico de Eventos
						</h3>
						<p className="text-sm">
							Estados operacionais (ligado/desligado, brilho, cor, temperatura
							alvo), medições instantâneas de consumo de energia (potência em
							Watts, tensão, corrente), leituras ambientais de sensores
							(temperatura, umidade, luminosidade) e histórico de disparo de
							regras de automação.
						</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							d) Integrações Externas Opcionais
						</h3>
						<ul className="list-disc pl-5 space-y-1 text-sm">
							<li>
								<strong>Spotify Web API:</strong> quando conectado expressamente
								pelo usuário, acessamos apenas os escopos de leitura e controle
								de reprodução (<em>user-read-playback-state</em> e{" "}
								<em>user-modify-playback-state</em>) para exibir a faixa musical
								ativa e permitir automações de áudio.
							</li>
							<li>
								<strong>Google Cast / Chromecast / Android TV:</strong>{" "}
								descoberta local e envio de comandos básicos de mídia (play,
								pause, volume) através da rede local, sem tráfego de dados para
								servidores externos.
							</li>
							<li>
								<strong>Dispositivos Tuya / Sonoff / ESPHome:</strong>{" "}
								comunicação efetuada diretamente na rede local via protocolos
								locais (TCP/UDP criptografado AES ou broker MQTT interno).
							</li>
						</ul>
					</div>
				</div>
			</section>

			{/* 3. Finalidades e Bases Legais */}
			<section id="finalidades" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					3. Finalidade e Base Legal do Tratamento (LGPD)
				</h2>
				<p>
					O tratamento de seus dados é fundamentado nas hipóteses previstas na
					Lei Geral de Proteção de Dados Pessoais (Lei Federal nº 13.709/2018):
				</p>
				<ul className="list-disc pl-5 space-y-2 text-sm">
					<li>
						<strong>Execução de Contrato e Termos de Uso (Art. 7º, V):</strong>{" "}
						autenticar o usuário, manter a sessão ativa, orquestrar os
						dispositivos conectados e executar fielmente as rotinas programadas
						pelo usuário.
					</li>
					<li>
						<strong>Legítimo Interesse do Controlador (Art. 7º, IX):</strong>{" "}
						diagnóstico preventivo de falhas de rede, análise de estabilidade da
						telemetria e aprimoramento da experiência de uso do ecossistema.
					</li>
					<li>
						<strong>Consentimento Específico (Art. 7º, I):</strong> aplicável
						quando você opta por conectar integrações de terceiros (como Spotify
						ou Google), podendo o consentimento ser revogado a qualquer momento
						desconectando a integração.
					</li>
				</ul>
			</section>

			{/* 4. Compartilhamento com Terceiros */}
			<section id="compartilhamento" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					4. Compartilhamento de Dados com Terceiros
				</h2>
				<div className="rounded-lg border border-border bg-surface-high/60 p-4 text-foreground">
					<p className="text-sm font-semibold">
						Compromisso Central: O Nexus Hub NÃO comercializa, aluga, cede ou
						compartilha seus dados pessoais com corretores de dados ou redes de
						publicidade.
					</p>
				</div>
				<p>
					O compartilhamento de dados ocorre exclusivamente nos seguintes
					limites operacionais:
				</p>
				<ul className="list-disc pl-5 space-y-1 text-sm">
					<li>
						<strong>Provedores de Infraestrutura Essenciais:</strong> Google
						Firebase para serviços seguros de autenticação e gerenciamento de
						identidade.
					</li>
					<li>
						<strong>Provedores de Serviços Conectados por Você:</strong> APIs de
						serviços como Spotify ou Google quando o usuário decide
						voluntariamente integrá-los à sua residência.
					</li>
					<li>
						<strong>Determinação Legal:</strong> caso seja exigido por ordem
						judicial ou requisição legal emitida por autoridade competente.
					</li>
				</ul>
			</section>

			{/* 5. Retenção e Descarte de Dados */}
			<section id="retencao" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					5. Prazos de Retenção e Descarte
				</h2>
				<p>
					Adotamos critérios diferenciados de retenção conforme a natureza do
					dado:
				</p>
				<ul className="list-disc pl-5 space-y-2 text-sm">
					<li>
						<strong>Dados de Conta e Configurações:</strong> mantidos enquanto
						sua conta estiver ativa. Ao solicitar a exclusão da conta, os dados
						cadastrais e vínculos de cômodos são imediatamente anonimizados ou
						eliminados.
					</li>
					<li>
						<strong>Telemetria Histórica de Dispositivos:</strong> métricas
						agregadas de consumo elétrico, temperatura e registros de execução
						de automações são mantidas de forma <em>append-only</em> no banco de
						dados TimescaleDB. O propósito é permitir que o usuário analise o
						histórico longitudinal de consumo da residência e subsidiar futuras
						pesquisas e modelos de otimização energética por inteligência
						artificial / machine learning.
					</li>
				</ul>
			</section>

			{/* 6. Direitos do Titular */}
			<section id="direitos-titular" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					6. Direitos do Titular de Dados (Art. 18 da LGPD)
				</h2>
				<p>
					Como titular dos dados, você tem o direito de requerer a qualquer
					momento:
				</p>
				<ol className="list-decimal pl-5 space-y-1 text-sm">
					<li>Confirmação da existência de tratamento;</li>
					<li>Acesso completo e transparente aos seus dados armazenados;</li>
					<li>Correção de dados incompletos, inexatos ou desatualizados;</li>
					<li>
						Eliminação ou anonimização de dados desnecessários ou tratados com
						base em consentimento;
					</li>
					<li>Portabilidade de seus dados a outro prestador de serviço;</li>
					<li>Revogação do consentimento concedido para integrações.</li>
				</ol>
				<p className="text-sm">
					Para exercer qualquer um desses direitos, basta enviar uma mensagem
					com sua solicitação para o e-mail:{" "}
					<a
						href="mailto:duduceretta@gmail.com"
						className="font-mono text-xs font-semibold text-primary underline hover:opacity-80"
					>
						duduceretta@gmail.com
					</a>
					. Sua demanda será respondida sem cobrança de custos e dentro dos
					prazos da LGPD.
				</p>
			</section>

			{/* 7. Cookies e Armazenamento Local */}
			<section id="cookies-armazenamento" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					7. Cookies e Armazenamento no Navegador
				</h2>
				<p>
					O Nexus Hub preza pela privacidade estrita na web. Não utilizamos
					cookies de rastreamento de terceiros ou scripts voltados à publicidade
					direcionada.
				</p>
				<p className="text-sm">
					Utilizamos exclusivamente recursos de armazenamento do próprio
					navegador (<strong>localStorage</strong> e{" "}
					<strong>sessionStorage</strong>) para finalidades estritamente
					técnicas:
				</p>
				<ul className="list-disc pl-5 space-y-1 text-sm">
					<li>
						Armazenar sua preferência de tema visual (modo dark, paleta de cor
						selecionada);
					</li>
					<li>Manter o estado efêmero de navegação e abas abertas;</li>
					<li>
						Armazenar o token de autenticação JWT temporário necessário para
						autenticar as requisições à API.
					</li>
				</ul>
			</section>

			{/* 8. Segurança */}
			<section id="seguranca" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					8. Segurança da Informação
				</h2>
				<p>
					Empregamos medidas técnicas e organizacionais proporcionais para
					proteger seus dados, tais como tráfego estritamente criptografado sob
					protocolo HTTPS/TLS, autenticação de endpoints com JWT, sanitização de
					entradas contra injeção e comunicação local direta com dispositivos
					IoT através de credenciais criptografadas.
				</p>
			</section>

			{/* 9. Contato */}
			<section id="contato" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					9. Dúvidas e Canal de Atendimento
				</h2>
				<p>
					Se você tiver dúvidas, sugestões ou desejar reportar qualquer questão
					de segurança ou privacidade sobre o Nexus Hub, entre em contato
					diretamente com o responsável pelo projeto:
				</p>
				<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
					<p className="text-sm font-semibold text-foreground">
						Eduardo — Nexus Hub
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Responsável pelo Tratamento de Dados (DPO)
					</p>
					<p className="text-sm font-mono mt-2 text-foreground">
						E-mail:{" "}
						<a
							href="mailto:duduceretta@gmail.com"
							className="text-primary underline hover:opacity-80 font-bold"
						>
							duduceretta@gmail.com
						</a>
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						Domínio da aplicação: nexushub.page
					</p>
				</div>
			</section>
		</>
	);
}
