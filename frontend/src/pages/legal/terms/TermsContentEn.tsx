export function TermsContentEn() {
	return (
		<>
			{/* 1. Natureza do Serviço */}
			<section id="natureza-servico" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					1. Nature of the Platform and Current Stage
				</h2>
				<p>
					<strong>Nexus Hub</strong> (available at{" "}
					<span className="font-mono text-xs text-foreground">
						nexushub.page
					</span>
					) is a residential automation and orchestration platform conceived
					with predominantly local architecture principles (<em>Local-First</em>
					), developed by <strong>Eduardo</strong> within the scope of a
					Computer Engineering / Software Capstone Project (TCC) and in
					continuous transition to a beta testing environment.
				</p>
				<p>
					As an academic research and engineering project in continuous
					evolution, the service is made available on an{" "}
					<strong>"as is"</strong> and <strong>"as available"</strong> basis,
					subject to changes, additions of new capabilities, and periodic
					improvements without prior notice.
				</p>
			</section>

			{/* 2. Aceitação dos Termos */}
			<section id="aceitacao" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					2. Acceptance of Terms
				</h2>
				<p>
					By accessing, signing up for, or using the Nexus Hub platform, you
					declare that you have read, understood, and agreed to these Terms of
					Service and our Privacy Policy. If you do not agree with any provision
					set forth herein, you must refrain from using the platform.
				</p>
			</section>

			{/* 3. Responsabilidades do Usuário */}
			<section id="responsabilidades" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					3. User Responsibilities and Credentials
				</h2>
				<ul className="list-disc pl-5 space-y-2 text-sm">
					<li>
						<strong>Confidentiality of Credentials:</strong> you are solely
						responsible for safeguarding the confidentiality and security of the
						password associated with your account and for all actions executed
						under your login credentials.
					</li>
					<li>
						<strong>Lawful Use:</strong> you agree not to use Nexus Hub for any
						unlawful, fraudulent purpose or in violation of third-party privacy
						and security rights on the network or in the residence.
					</li>
					<li>
						<strong>System Integrity:</strong> attempting to bypass
						authentication locks, exploit vulnerabilities, or overload the
						ecosystem's API infrastructure is strictly prohibited.
					</li>
				</ul>
			</section>

			{/* 4. Uso com Dispositivos Físicos */}
			<section id="dispositivos" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					4. Use with Physical Devices and Electrical Safety
				</h2>
				<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
					<p className="text-sm font-semibold text-foreground mb-1">
						Attention to Physical Hardware Safety:
					</p>
					<p className="text-sm">
						Nexus Hub acts exclusively as a software logic and automation
						supervision layer. Responsibility for electrical installation,
						insulation, load capacity (amperage/voltage), and physical
						compatibility of actuators, plugs, switches, relays, motors, and
						controlled appliances rests entirely with the user and qualified
						electrical professionals.
					</p>
				</div>
				<p className="text-sm">
					The developer of Nexus Hub is not liable for potential device burnout,
					circuit overload, poor electrical contacts, or property damages
					derived from intrinsic hardware defects of third-party manufacturers
					connected to the local network.
				</p>
			</section>

			{/* 5. Integrações e Serviços de Terceiros */}
			<section id="terceiros" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					5. Reliance on Third-Party Services and APIs
				</h2>
				<p>
					Nexus Hub may optionally interact with third-party services and
					protocols, including but not limited to:
				</p>
				<ul className="list-disc pl-5 space-y-1 text-sm">
					<li>
						<strong>Google Firebase:</strong> identity management and social
						login;
					</li>
					<li>
						<strong>Spotify Web API:</strong> audio synchronization and playback
						control;
					</li>
					<li>
						<strong>Google Cast:</strong> control of Chromecast and Android TV
						devices;
					</li>
					<li>
						<strong>Tuya / Smart Life / Sonoff / ESPHome:</strong> IoT hardware
						integrated via local network or MQTT.
					</li>
				</ul>
				<p className="text-sm">
					These services operate under their own terms and policies. Nexus Hub
					has no control over them and is not liable for temporary downtime,
					sudden changes in third-party APIs, revoked access, or discontinued
					support promoted by the respective providers.
				</p>
			</section>

			{/* 6. Isenção de Garantias */}
			<section id="disponibilidade" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					6. Disclaimer of Warranties and Limitation of Liability
				</h2>
				<p>
					Although the project employs modern software engineering best
					practices and continuous automated testing, we cannot guarantee that
					the platform will operate 100% free of errors or without occasional
					interruptions resulting from local network drops, router failures, or
					server reboots.
				</p>
				<p className="text-sm">
					In no event shall the developer of Nexus Hub be liable for indirect
					damages, lost profits, or lost opportunities arising from the use or
					inability to use the system.
				</p>
			</section>

			{/* 7. Propriedade Intelectual */}
			<section id="propriedade" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					7. Intellectual Property
				</h2>
				<p>
					The name "Nexus Hub", logos, original architectural illustrations,
					source code, and visual design are owned by their creators and
					protected by copyright and software laws. Users receive a personal,
					non-exclusive, non-transferable license to use the system for their
					residential purposes.
				</p>
			</section>

			{/* 8. Alterações nos Termos */}
			<section id="alteracoes" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					8. Changes and Updates to Terms
				</h2>
				<p>
					These terms may be revised periodically to reflect the launch of new
					features or regulatory adjustments. Whenever substantial changes
					occur, the last updated date at the top of this page will be revised.
					Continued use of the system after modifications constitutes tacit
					consent with the updated terms.
				</p>
			</section>

			{/* 9. Contato */}
			<section id="contato" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					9. Contact and Legal Notices
				</h2>
				<p>
					For questions, problem reports, or inquiries regarding these Terms of
					Service, please use the official contact channel:
				</p>
				<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
					<p className="text-sm font-semibold text-foreground">
						Eduardo — Nexus Hub
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">Project Lead</p>
					<p className="text-sm font-mono mt-2 text-foreground">
						Email:{" "}
						<a
							href="mailto:duduceretta@gmail.com"
							className="text-primary underline hover:opacity-80 font-bold"
						>
							duduceretta@gmail.com
						</a>
					</p>
					<p className="text-xs text-muted-foreground mt-1">
						Application domain: nexushub.page
					</p>
				</div>
			</section>
		</>
	);
}
