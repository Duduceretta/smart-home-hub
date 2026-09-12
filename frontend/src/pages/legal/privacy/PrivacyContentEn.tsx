export function PrivacyContentEn() {
	return (
		<>
			{/* 1. Responsável pelo Tratamento */}
			<section id="responsavel" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					1. Data Controller Identification
				</h2>
				<p>
					This Privacy Policy applies to the <strong>Nexus Hub</strong> platform
					(available at{" "}
					<span className="font-mono text-xs text-foreground">
						nexushub.page
					</span>
					), an intelligent home automation ecosystem designed with
					predominantly local architecture (<em>Local-First</em>).
				</p>
				<p>
					The controller responsible for processing personal data collected by
					the platform is <strong>Eduardo</strong>, creator and maintainer of
					Nexus Hub. The project is an evolving software engineering capstone
					project (TCC), operating individually without a formal legal entity
					registration (CNPJ) at this time.
				</p>
				<p>
					For any inquiries or requests regarding privacy and data protection,
					the direct official contact channel is:{" "}
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
					2. Personal Data and Information Collected
				</h2>
				<p>
					To enable intelligent home orchestration and monitoring, Nexus Hub
					strictly collects the data categories required to deliver services:
				</p>

				<div className="space-y-4">
					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							a) Registration and Authentication Data
						</h3>
						<p className="text-sm">
							Full name, email address, and unique user identifier (UID),
							managed through the identity provider{" "}
							<strong>Firebase Authentication</strong> (Google). We do not store
							or have access to your plain-text password.
						</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							b) Residential Topology, Devices, and Automations
						</h3>
						<p className="text-sm">
							Room names, device groups, registered device brands and models,
							local IP and MAC addresses used on the home network for direct
							communication, and conditional rules/schedules configured for
							automation.
						</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							c) Operational Telemetry and Event History
						</h3>
						<p className="text-sm">
							Operational states (on/off, brightness, color, target
							temperature), instant energy consumption measurements (power in
							Watts, voltage, current), environmental sensor readings
							(temperature, humidity, illuminance), and automation execution
							trigger logs.
						</p>
					</div>

					<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
						<h3 className="text-sm font-semibold text-foreground mb-1">
							d) Optional External Integrations
						</h3>
						<ul className="list-disc pl-5 space-y-1 text-sm">
							<li>
								<strong>Spotify Web API:</strong> when explicitly connected by
								the user, we access only playback read and control scopes (
								<em>user-read-playback-state</em> and{" "}
								<em>user-modify-playback-state</em>) to display the active track
								and trigger audio automations.
							</li>
							<li>
								<strong>Google Cast / Chromecast / Android TV:</strong> local
								discovery and basic media commands (play, pause, volume) over
								the local network, without data transmission to external
								servers.
							</li>
							<li>
								<strong>Tuya / Sonoff / ESPHome Devices:</strong> communication
								conducted directly on the local network via local protocols
								(encrypted TCP/UDP or internal MQTT broker).
							</li>
						</ul>
					</div>
				</div>
			</section>

			{/* 3. Finalidades e Bases Legais */}
			<section id="finalidades" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					3. Purposes and Legal Grounds (LGPD)
				</h2>
				<p>
					The processing of your data is based on hypotheses provided by the
					Brazilian General Data Protection Law (LGPD — Law No. 13,709/2018):
				</p>
				<ul className="list-disc pl-5 space-y-2 text-sm">
					<li>
						<strong>
							Contract Execution and Terms of Service (Art. 7, V):
						</strong>{" "}
						authenticating users, maintaining active sessions, orchestrating
						connected devices, and executing configured automation routines.
					</li>
					<li>
						<strong>Controller Legitimate Interest (Art. 7, IX):</strong>{" "}
						preventive diagnostics of network failures, telemetry stability
						analysis, and ecosystem experience improvements.
					</li>
					<li>
						<strong>Specific Consent (Art. 7, I):</strong> applicable when you
						opt into third-party integrations (such as Spotify or Google), which
						can be revoked at any time by disconnecting the integration.
					</li>
				</ul>
			</section>

			{/* 4. Compartilhamento com Terceiros */}
			<section id="compartilhamento" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					4. Third-Party Data Sharing
				</h2>
				<div className="rounded-lg border border-border bg-surface-high/60 p-4 text-foreground">
					<p className="text-sm font-semibold">
						Core Commitment: Nexus Hub DOES NOT sell, rent, lease, or share your
						personal data with data brokers or advertising networks.
					</p>
				</div>
				<p>Data sharing occurs strictly within these operational limits:</p>
				<ul className="list-disc pl-5 space-y-1 text-sm">
					<li>
						<strong>Essential Infrastructure Providers:</strong> Google Firebase
						for secure authentication and identity management services.
					</li>
					<li>
						<strong>Services Connected by You:</strong> APIs of services like
						Spotify or Google when voluntarily integrated by the user into the
						residence.
					</li>
					<li>
						<strong>Legal Obligations:</strong> if required by a court order or
						legal subpoena issued by competent authorities.
					</li>
				</ul>
			</section>

			{/* 5. Retenção e Descarte de Dados */}
			<section id="retencao" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					5. Data Retention and Deletion
				</h2>
				<p>We adopt differentiated retention criteria based on data nature:</p>
				<ul className="list-disc pl-5 space-y-2 text-sm">
					<li>
						<strong>Account and Configuration Data:</strong> retained while your
						account is active. Upon requesting account deletion, registration
						details and room links are immediately anonymized or deleted.
					</li>
					<li>
						<strong>Historical Device Telemetry:</strong> aggregated energy
						metrics, temperatures, and automation execution records are kept in
						an <em>append-only</em> TimescaleDB database to enable longitudinal
						household energy analysis and support future research in AI/ML
						energy optimization.
					</li>
				</ul>
			</section>

			{/* 6. Direitos do Titular */}
			<section id="direitos-titular" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					6. Data Subject Rights (LGPD Art. 18)
				</h2>
				<p>As a data subject, you have the right to request at any time:</p>
				<ol className="list-decimal pl-5 space-y-1 text-sm">
					<li>Confirmation of data processing existence;</li>
					<li>Full and transparent access to your stored data;</li>
					<li>Correction of incomplete, inaccurate, or outdated data;</li>
					<li>
						Anonymization, blocking, or deletion of unnecessary or excessive
						data;
					</li>
					<li>Data portability to another service provider;</li>
					<li>Revocation of consent granted for integrations.</li>
				</ol>
				<p className="text-sm">
					To exercise any of these rights, send your request to:{" "}
					<a
						href="mailto:duduceretta@gmail.com"
						className="font-mono text-xs font-semibold text-primary underline hover:opacity-80"
					>
						duduceretta@gmail.com
					</a>
					. Your request will be addressed free of charge within LGPD deadlines.
				</p>
			</section>

			{/* 7. Cookies e Armazenamento Local */}
			<section id="cookies-armazenamento" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					7. Cookies and Browser Storage
				</h2>
				<p>
					Nexus Hub prioritizes strict web privacy. We do not use third-party
					tracking cookies or targeted advertising scripts.
				</p>
				<p className="text-sm">
					We exclusively use browser-native storage resources (
					<strong>localStorage</strong> and <strong>sessionStorage</strong>) for
					purely technical purposes:
				</p>
				<ul className="list-disc pl-5 space-y-1 text-sm">
					<li>
						Storing your theme visual preference (dark mode, selected color
						preset);
					</li>
					<li>Maintaining ephemeral navigation state and open tabs;</li>
					<li>
						Storing the temporary JWT authentication token required to
						authenticate API requests.
					</li>
				</ul>
			</section>

			{/* 8. Segurança */}
			<section id="seguranca" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					8. Information Security
				</h2>
				<p>
					We employ technical and organizational measures to safeguard your
					data, including encrypted HTTPS/TLS transport, JWT endpoint
					authentication, input sanitization against injection, and direct local
					communication with IoT hardware using encrypted credentials.
				</p>
			</section>

			{/* 9. Contato */}
			<section id="contato" className="space-y-3 scroll-mt-24">
				<h2 className="text-xl font-semibold text-foreground">
					9. Inquiries and Support Channel
				</h2>
				<p>
					If you have questions, suggestions, or wish to report any privacy or
					security concerns regarding Nexus Hub, please contact the project lead
					directly:
				</p>
				<div className="rounded-lg border border-border-subtle bg-surface-low p-4">
					<p className="text-sm font-semibold text-foreground">
						Eduardo — Nexus Hub
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Data Protection Officer (DPO)
					</p>
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
