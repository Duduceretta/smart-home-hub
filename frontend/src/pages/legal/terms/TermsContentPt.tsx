export function TermsContentPt() {
	return (
		<>
			{/* 1. Natureza do Serviço */}
			<section id="natureza-servico" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					1. Natureza da Plataforma e Estágio Atual
				</h2>
				<p>
					O <strong>Nexus Hub</strong> (disponível em{" "}
					<span className="font-mono text-xs text-foreground">
						nexushub.page
					</span>
					) é uma plataforma de automação e orquestração residencial concebida
					com princípios de arquitetura prioritariamente local (
					<em>Local-First</em>), desenvolvida por <strong>Eduardo</strong> no
					âmbito de Trabalho de Conclusão de Curso (TCC) e em transição contínua
					para ambiente de teste beta.
				</p>
				<p>
					Por se tratar de um projeto de pesquisa acadêmica e engenharia em
					constante evolução, o serviço é disponibilizado no estado em que se
					encontra (<strong>"as is"</strong>) e conforme a disponibilidade (
					<strong>"as available"</strong>), podendo sofrer alterações, inclusões
					de novas capacidades e melhorias periódicas sem aviso prévio.
				</p>
			</section>

			{/* 2. Aceitação dos Termos */}
			<section id="aceitacao" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					2. Aceitação dos Termos
				</h2>
				<p>
					Ao acessar, cadastrar-se ou utilizar a plataforma Nexus Hub, você
					declara ter lido, compreendido e concordado com estes Termos de
					Serviço e com a nossa Política de Privacidade. Caso não concorde com
					qualquer disposição aqui expressa, você deve abster-se de utilizar a
					plataforma.
				</p>
			</section>

			{/* 3. Responsabilidades do Usuário */}
			<section id="responsabilidades" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					3. Responsabilidades do Usuário e Credenciais
				</h2>
				<ul className="list-disc pl-5 space-y-2 text-sm">
					<li>
						<strong>Sigilo de Credenciais:</strong> você é o único responsável
						pela guarda, confidencialidade e segurança da senha associada à sua
						conta e por todas as ações executadas sob suas credenciais de login.
					</li>
					<li>
						<strong>Uso Lícito:</strong> você se compromete a não utilizar o
						Nexus Hub para qualquer finalidade ilícita, fraudulenta ou que viole
						direitos de privacidade e segurança de terceiros na rede ou na
						residência.
					</li>
					<li>
						<strong>Integridade do Sistema:</strong> é proibido tentar contornar
						travas de autenticação, explorar vulnerabilidades ou sobrecarregar a
						infraestrutura da API do ecossistema.
					</li>
				</ul>
			</section>

			{/* 4. Uso com Dispositivos Físicos */}
			<section id="dispositivos" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					4. Uso com Dispositivos Físicos e Segurança Elétrica
				</h2>
				<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
					<p className="text-sm font-semibold text-foreground mb-1">
						Atenção à Segurança do Hardware Físico:
					</p>
					<p className="text-sm">
						O Nexus Hub atua exclusivamente como camada lógica de software e
						supervisão de automação. A responsabilidade pela instalação
						elétrica, isolamento, capacidade de carga (amperagem/voltagem) e
						compatibilidade física de atuadores, tomadas, interruptores, relés,
						motores e aparelhos controlados é integralmente do usuário e de
						profissionais eletricistas qualificados.
					</p>
				</div>
				<p className="text-sm">
					O desenvolvedor do Nexus Hub não se responsabiliza por eventuais
					queimas de dispositivos, sobrecargas de circuito, mau contato elétrico
					ou danos materiais derivados de defeitos intrínsecos de hardware dos
					fabricantes terceiros conectados à rede local.
				</p>
			</section>

			{/* 5. Integrações e Serviços de Terceiros */}
			<section id="terceiros" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					5. Dependência de Serviços e APIs de Terceiros
				</h2>
				<p>
					O Nexus Hub pode interagir opcionalmente com serviços e protocolos de
					terceiros, incluindo mas não se limitando a:
				</p>
				<ul className="list-disc pl-5 space-y-1 text-sm">
					<li>
						<strong>Google Firebase:</strong> gestão de identidades e login
						social;
					</li>
					<li>
						<strong>Spotify Web API:</strong> sincronização de áudio e controle
						de reprodução;
					</li>
					<li>
						<strong>Google Cast:</strong> controle de dispositivos Chromecast e
						Android TV;
					</li>
					<li>
						<strong>Tuya / Smart Life / Sonoff / ESPHome:</strong> hardware IoT
						integrado via rede local ou MQTT.
					</li>
				</ul>
				<p className="text-sm">
					Esses serviços operam sob termos e políticas próprias. O Nexus Hub não
					possui ingerência sobre eles e não se responsabiliza por
					instabilidades temporárias, mudanças repentinas em APIs de terceiros,
					revogações de acesso ou descontinuidade de suporte promovidas pelos
					respectivos provedores.
				</p>
			</section>

			{/* 6. Isenção de Garantias */}
			<section id="disponibilidade" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					6. Isenção de Garantias e Limitação de Responsabilidade
				</h2>
				<p>
					Embora o projeto empregue boas práticas modernas de engenharia de
					software e testes contínuos, não podemos garantir que a plataforma
					operará 100% livre de erros ou sem interrupções ocasionais decorrentes
					de quedas de rede local, falhas de roteador ou reinicializações do
					servidor.
				</p>
				<p className="text-sm">
					Em nenhuma hipótese o desenvolvedor do Nexus Hub será responsabilizado
					por danos indiretos, lucros cessantes ou perdas de oportunidade
					decorrentes do uso ou da impossibilidade de uso do sistema.
				</p>
			</section>

			{/* 7. Propriedade Intelectual */}
			<section id="propriedade" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					7. Propriedade Intelectual
				</h2>
				<p>
					O nome "Nexus Hub", logotipos, ilustrações arquitetônicas originais,
					código-fonte e design visual são de titularidade de seus criadores e
					protegidos pelas leis de direitos autorais e de software. O usuário
					recebe uma licença pessoal, não exclusiva e intransferível para
					utilizar o sistema para seus propósitos residenciais.
				</p>
			</section>

			{/* 8. Alterações nos Termos */}
			<section id="alteracoes" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					8. Alterações e Atualizações dos Termos
				</h2>
				<p>
					Estes termos podem ser revisados periodicamente para refletir o
					lançamento de novas funcionalidades ou adequações normativas. Sempre
					que houver alterações substanciais, a data de última atualização no
					topo desta página será revisada. A permanência no uso do sistema após
					as modificações constitui anuência tácita com os termos atualizados.
				</p>
			</section>

			{/* 9. Contato */}
			<section id="contato" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					9. Contato e Notificações Legais
				</h2>
				<p>
					Para dúvidas, reporte de problemas ou questões relativas a estes
					Termos de Serviço, utilize o canal oficial:
				</p>
				<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
					<p className="text-sm font-semibold text-foreground">
						Eduardo — Nexus Hub
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Responsável pelo Projeto
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
