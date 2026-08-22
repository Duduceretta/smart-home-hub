import {
	Activity,
	Bell,
	ChevronDown,
	Cpu,
	Disc,
	Home,
	LayoutGrid,
	Lightbulb,
	Minus,
	Moon,
	Pause,
	Play,
	Plus,
	Radio,
	Search,
	Settings,
	Shield,
	SkipBack,
	SkipForward,
	Sun,
	Tv,
	User,
	Video,
	Volume2,
	Wind,
	Zap,
} from "lucide-react";
import { type CSSProperties, useState } from "react";
import { Badge } from "@/core/components/ui/badge";
import { Button } from "@/core/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card";
import { Input } from "@/core/components/ui/input";
import { Slider } from "@/core/components/ui/slider";

/**
 * Mesma paleta escopada (Warm Dark) usada em
 * features/devices/components/mock.tsx — reaproveitada aqui só para manter
 * os previews de protótipo visualmente consistentes entre si.
 */
const mockThemeVars = {
	"--background": "#141314",
	"--foreground": "#e5e2e2",
	"--card": "#2a2a2a",
	"--card-foreground": "#e5e2e2",
	"--popover": "#201f20",
	"--popover-foreground": "#e5e2e2",
	"--primary": "#c5c6cf",
	"--primary-foreground": "#2e3037",
	"--secondary": "#c4c6d2",
	"--secondary-foreground": "#2d303a",
	"--muted": "#1c1b1c",
	"--muted-foreground": "#c7c6cb",
	"--accent": "#201f20",
	"--accent-foreground": "#e5e2e2",
	"--destructive": "#ffb4ab",
	"--border": "rgba(70,70,75,0.25)",
	"--input": "rgba(70,70,75,0.35)",
	"--ring": "#c5c6cf",
} as CSSProperties;

interface MockSwitchProps {
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
}

function MockSwitch({ checked, onCheckedChange }: MockSwitchProps) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onCheckedChange(!checked)}
			className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
				checked ? "bg-primary" : "bg-muted"
			}`}
		>
			<span
				className={`absolute top-0.5 h-4 w-4 rounded-full bg-card shadow-sm transition-transform ${
					checked ? "translate-x-4.5" : "translate-x-0.5"
				}`}
			/>
		</button>
	);
}

const NAV_ITEMS = [
	{ key: "dashboard", label: "Dashboard", icon: LayoutGrid },
	{ key: "devices", label: "Dispositivos", icon: Zap },
	{ key: "environments", label: "Ambientes", icon: Home },
	{ key: "automations", label: "Automações", icon: Radio },
	{ key: "analytics", label: "Análises", icon: Activity },
	{ key: "security", label: "Segurança", icon: Shield },
	{ key: "settings", label: "Configurações", icon: Settings },
] as const;

const FILTERS = [
	{ key: "all", label: "TODOS" },
	{ key: "lights", label: "LUZES" },
	{ key: "climate", label: "CLIMA" },
	{ key: "media", label: "MÍDIA" },
] as const;

const LIGHT_PRESETS = ["#ffb873", "#d3c4b8", "#c5c6cf", "#c4c6d2", "#93000a"];

export default function DashboardMockPreview() {
	const [activeScene, setActiveScene] = useState("cinema");
	const [activeFilter, setActiveFilter] =
		useState<(typeof FILTERS)[number]["key"]>("all");

	const [isTvOn, setIsTvOn] = useState(true);
	const [tvVolume, setTvVolume] = useState([45]);
	const [isLightOn, setIsLightOn] = useState(true);
	const [lightBrightness, setLightBrightness] = useState([85]);
	const [targetTemp, setTargetTemp] = useState(22);
	const [isPlugOn, setIsPlugOn] = useState(true);
	const [spotifyVolume, setSpotifyVolume] = useState([65]);
	const [isSpotifyPlaying, setIsSpotifyPlaying] = useState(true);

	return (
		<div
			className="flex min-h-screen bg-background text-foreground"
			style={mockThemeVars}
		>
			{/* Sidebar Lateral */}
			<aside className="fixed left-0 top-0 h-full w-60 border-r border-border bg-card/40 backdrop-blur-xl z-50 flex flex-col justify-between p-4">
				<div className="space-y-6">
					<div className="flex items-center gap-2.5 px-1">
						<div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
							<Cpu className="h-4 w-4" />
						</div>
						<span className="font-bold text-sm tracking-widest text-foreground">
							AETHER OS
						</span>
					</div>

					<nav className="space-y-1">
						{NAV_ITEMS.map((item) => (
							<Button
								key={item.key}
								variant={item.key === "dashboard" ? "secondary" : "ghost"}
								className={`w-full justify-start gap-3 text-sm h-9 ${
									item.key === "dashboard"
										? "font-semibold bg-primary/15 text-primary shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</Button>
						))}
					</nav>
				</div>

				<Card className="bg-muted/60 border-border/60">
					<CardContent className="p-3 space-y-2">
						<div className="flex items-center justify-between text-[10px] font-semibold tracking-wider uppercase text-muted-foreground">
							<span>System Health</span>
						</div>
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground">Uptime</span>
							<span className="text-primary font-mono font-bold">14d 02h</span>
						</div>
						<div className="h-1 w-full rounded-full bg-background overflow-hidden">
							<div className="h-full w-1/3 rounded-full bg-primary" />
						</div>
					</CardContent>
				</Card>
			</aside>

			{/* Main Content Area */}
			<div className="pl-60 flex-1 flex flex-col min-w-0">
				<header className="sticky top-0 z-40 h-14 border-b border-border bg-background/90 backdrop-blur-xl px-6 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3 min-w-0 flex-1 max-w-md">
						<div className="relative w-full">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
							<Input
								placeholder="Search..."
								className="pl-8 bg-muted/60 border-border h-8 text-xs"
							/>
						</div>
					</div>

					<div className="flex items-center gap-4 shrink-0">
						<div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border border-border text-xs font-medium">
							<span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
							System: Optimal
						</div>
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 rounded-full relative text-muted-foreground"
						>
							<Bell className="h-4 w-4" />
							<span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-[#d3c4b8]" />
						</Button>
						<div className="hidden md:flex flex-col items-end leading-none">
							<span className="text-xs font-medium text-foreground">Admin</span>
							<span className="text-[10px] font-mono text-muted-foreground/60">
								Level: 3 Access
							</span>
						</div>
						<div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
							<User className="h-4 w-4" />
						</div>
					</div>
				</header>

				<main className="p-6 space-y-5 flex-1 flex flex-col">
					{/* SCENES + FILTER CHIPS */}
					<div className="space-y-3">
						<div className="flex items-center gap-2 overflow-x-auto pb-1">
							<Button
								variant="outline"
								onClick={() => setActiveScene("arrive")}
								className="rounded-full bg-muted border-border hover:bg-accent text-xs gap-2 h-8 px-3.5"
							>
								<Home className="h-3.5 w-3.5 text-muted-foreground" />
								Cheguei em Casa
							</Button>

							<Button
								variant="outline"
								onClick={() => setActiveScene("cinema")}
								className={`rounded-full text-xs gap-2 h-8 px-3.5 ${
									activeScene === "cinema"
										? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_12px_rgba(197,198,207,0.2)]"
										: "bg-muted border-border hover:bg-accent"
								}`}
							>
								<Tv className="h-3.5 w-3.5" />
								Cinema
							</Button>

							<Button
								variant="outline"
								onClick={() => setActiveScene("sleep")}
								className="rounded-full bg-muted border-border hover:bg-accent text-xs gap-2 h-8 px-3.5"
							>
								<Moon className="h-3.5 w-3.5 text-muted-foreground" />
								Modo Dormir
							</Button>

							<Button
								variant="outline"
								onClick={() => setActiveScene("leave")}
								className="rounded-full bg-muted border-border hover:bg-accent text-xs gap-2 h-8 px-3.5"
							>
								<Home className="h-3.5 w-3.5 text-muted-foreground" />
								Sair de Casa
							</Button>
						</div>

						<div className="flex items-center gap-4">
							{FILTERS.map((filter) => (
								<button
									key={filter.key}
									type="button"
									onClick={() => setActiveFilter(filter.key)}
									className={`text-[11px] font-mono tracking-wider pb-1 border-b-2 transition-colors cursor-pointer ${
										activeFilter === filter.key
											? "text-foreground border-primary"
											: "text-muted-foreground/60 border-transparent hover:text-foreground"
									}`}
								>
									{filter.label}
								</button>
							))}
						</div>
					</div>

					{/* TOP KPI ROW */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						<Card className="bg-card/80 border-border shadow-none">
							<CardContent className="p-4 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
										Total Load
									</span>
									<Zap className="h-3.5 w-3.5 text-primary" />
								</div>
								<p className="text-2xl font-light text-foreground">
									4.2{" "}
									<span className="text-xs font-mono text-muted-foreground/60">
										kW
									</span>
								</p>
							</CardContent>
						</Card>

						<Card className="bg-card/80 border-border shadow-none">
							<CardContent className="p-4 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
										Solar Yield
									</span>
									<Sun className="h-3.5 w-3.5 text-[#d3c4b8]" />
								</div>
								<p className="text-2xl font-light text-foreground">
									0.0{" "}
									<span className="text-xs font-mono text-muted-foreground/60">
										W
									</span>
								</p>
							</CardContent>
						</Card>

						<Card className="bg-card/80 border-[#ffb4ab]/30 shadow-none">
							<CardContent className="p-4 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
										Security
									</span>
									<Shield className="h-3.5 w-3.5 text-[#ffb4ab]" />
								</div>
								<div className="flex items-baseline gap-2">
									<Badge
										variant="outline"
										className="text-[9px] font-mono text-[#ffb4ab] border-[#ffb4ab]/40"
									>
										ARMED
									</Badge>
									<p className="text-sm font-medium text-foreground">
										1 Alerta
									</p>
								</div>
							</CardContent>
						</Card>

						<Card className="bg-card/80 border-border shadow-none">
							<CardContent className="p-4 space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
										Active Scene
									</span>
									<Moon className="h-3.5 w-3.5 text-primary" />
								</div>
								<p className="text-xl font-semibold text-primary">EVENING</p>
							</CardContent>
						</Card>
					</div>

					{/* MAIN SPLIT GRID */}
					<div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
						{/* LEFT 8 COLS */}
						<div className="lg:col-span-8 flex flex-col gap-5 h-full">
							{/* ENERGY TELEMETRY */}
							<Card className="bg-card/80 border-border shadow-none">
								<CardHeader className="flex flex-row items-center justify-between pb-2">
									<div className="flex items-center gap-2">
										<div className="h-4 w-1 bg-primary rounded-full" />
										<CardTitle className="text-sm font-medium tracking-tight text-foreground uppercase">
											Energy Telemetry
										</CardTitle>
									</div>
								</CardHeader>

								<CardContent className="grid grid-cols-3 gap-4 pb-2">
									<div>
										<span className="font-mono text-[10px] uppercase text-muted-foreground/70 tracking-wider">
											Daily Cost
										</span>
										<p className="text-lg font-light tracking-tight text-foreground mt-0.5">
											$1.42
										</p>
									</div>
									<div>
										<span className="font-mono text-[10px] uppercase text-muted-foreground/70 tracking-wider">
											Solar Yield
										</span>
										<p className="text-lg font-light tracking-tight text-foreground mt-0.5">
											0.0 W
										</p>
									</div>
									<div className="flex items-center gap-2 justify-self-end">
										<div className="relative h-9 w-9 shrink-0">
											<svg
												className="h-full w-full -rotate-90"
												viewBox="0 0 36 36"
												aria-hidden="true"
											>
												<path
													className="text-muted"
													d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
													fill="none"
													stroke="currentColor"
													strokeWidth="3"
												/>
												<path
													className="text-primary"
													d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
													fill="none"
													stroke="currentColor"
													strokeDasharray="32, 100"
													strokeWidth="3"
												/>
											</svg>
											<span className="absolute inset-0 flex items-center justify-center font-mono text-[8px] text-primary">
												32%
											</span>
										</div>
										<span className="font-mono text-[10px] uppercase text-muted-foreground/70 tracking-wider">
											Grid Cap
											<br />
											Live
										</span>
									</div>
								</CardContent>

								<CardContent className="pt-0">
									<div className="h-28 w-full relative flex items-end">
										<svg
											className="w-full h-full text-primary drop-shadow-[0_0_10px_rgba(197,198,207,0.25)]"
											preserveAspectRatio="none"
											viewBox="0 0 800 110"
											aria-hidden="true"
										>
											<defs>
												<linearGradient
													id="energyMockGrad"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="0%"
														stopColor="currentColor"
														stopOpacity="0.3"
													/>
													<stop
														offset="100%"
														stopColor="currentColor"
														stopOpacity="0"
													/>
												</linearGradient>
											</defs>
											<path
												d="M0 110 L0 75 Q60 85 120 65 T240 80 T360 35 T480 55 T600 25 T720 40 T800 15 L800 110 Z"
												fill="url(#energyMockGrad)"
											/>
											<path
												d="M0 75 Q60 85 120 65 T240 80 T360 35 T480 55 T600 25 T720 40 T800 15"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											/>
										</svg>
									</div>
								</CardContent>
							</Card>

							{/* LIVING ROOM */}
							<div className="space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Home className="h-3.5 w-3.5 text-primary/80" />
										<h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
											Living Room
										</h3>
									</div>
									<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Smart TV */}
									<Card className="bg-card border-border relative overflow-hidden shadow-none">
										<CardHeader className="flex flex-row items-center justify-between pb-2">
											<div className="flex items-center gap-2">
												<Tv className="h-4 w-4 text-primary" />
												<CardTitle className="text-sm font-semibold text-foreground">
													Smart TV
												</CardTitle>
											</div>
											<Badge
												variant="outline"
												className={`text-[9px] font-mono ${isTvOn ? "text-primary border-primary/30" : "text-muted-foreground border-border"}`}
											>
												{isTvOn ? "ON" : "OFF"}
											</Badge>
										</CardHeader>

										<CardContent className="space-y-3">
											<div className="flex items-center gap-3 p-2 rounded-lg bg-muted border border-border">
												<div className="h-8 w-8 rounded bg-destructive/20 text-destructive flex items-center justify-center shrink-0">
													<Play className="h-3.5 w-3.5 fill-current" />
												</div>
												<div className="min-w-0 flex-1">
													<span className="font-mono text-[9px] font-bold text-destructive uppercase">
														Netflix
													</span>
													<p className="text-xs font-medium text-foreground truncate">
														Stranger Things
													</p>
												</div>
												<button
													type="button"
													onClick={() => setIsTvOn((v) => !v)}
													className="text-muted-foreground hover:text-foreground"
												>
													{isTvOn ? (
														<Pause className="h-3.5 w-3.5 fill-current" />
													) : (
														<Play className="h-3.5 w-3.5 fill-current" />
													)}
												</button>
											</div>

											<div className="flex items-center gap-2">
												<Volume2 className="h-3.5 w-3.5 text-muted-foreground/70" />
												<Slider
													value={tvVolume}
													onValueChange={setTvVolume}
													max={100}
													step={1}
													className="w-full"
												/>
											</div>
										</CardContent>
									</Card>

									{/* Main Lights */}
									<Card className="bg-card border-border relative overflow-hidden shadow-none">
										<CardHeader className="flex flex-row items-center justify-between pb-2">
											<div className="flex items-center gap-2">
												<Lightbulb className="h-4 w-4 text-[#d3c4b8]" />
												<CardTitle className="text-sm font-semibold text-foreground">
													Main Lights
												</CardTitle>
											</div>
											<MockSwitch
												checked={isLightOn}
												onCheckedChange={setIsLightOn}
											/>
										</CardHeader>

										<CardContent className="space-y-3">
											<div className="flex items-center gap-2">
												{LIGHT_PRESETS.map((color) => (
													<button
														key={color}
														type="button"
														className="h-5 w-5 rounded-full border border-border/60 shrink-0"
														style={{ backgroundColor: color }}
													/>
												))}
											</div>

											<div className="flex items-center justify-between text-xs">
												<Slider
													value={lightBrightness}
													onValueChange={setLightBrightness}
													max={100}
													step={1}
													className="w-full"
												/>
												<span className="ml-3 font-mono text-foreground shrink-0">
													{lightBrightness[0]}%
												</span>
											</div>
										</CardContent>
									</Card>
								</div>
							</div>

							{/* OFFICE */}
							<div className="space-y-2.5">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<Home className="h-3.5 w-3.5 text-primary/80" />
										<h3 className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
											Office
										</h3>
									</div>
									<ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
								</div>

								<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
									{/* Mini Split */}
									<Card className="bg-card border-border shadow-none">
										<CardHeader className="flex flex-row items-center justify-between pb-2">
											<CardTitle className="text-sm font-semibold text-foreground">
												Mini Split
											</CardTitle>
											<Badge
												variant="outline"
												className="text-[9px] font-mono text-primary border-primary/30"
											>
												AUTO
											</Badge>
										</CardHeader>
										<CardContent className="flex flex-col items-center gap-3 pb-4">
											<div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
												<svg
													className="absolute inset-0 h-full w-full -rotate-90"
													viewBox="0 0 36 36"
													aria-hidden="true"
												>
													<path
														className="text-muted"
														d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
														fill="none"
														stroke="currentColor"
														strokeWidth="2.5"
													/>
													<path
														className="text-primary"
														d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
														fill="none"
														stroke="currentColor"
														strokeDasharray="60, 100"
														strokeWidth="2.5"
													/>
												</svg>
												<span className="text-2xl font-light text-foreground">
													{targetTemp}°
												</span>
											</div>
											<div className="flex items-center gap-2">
												<Button
													variant="outline"
													size="icon"
													onClick={() =>
														setTargetTemp((t) => Math.max(16, t - 1))
													}
													className="h-7 w-7 rounded-full border-border bg-muted"
												>
													<Minus className="h-3.5 w-3.5" />
												</Button>
												<span className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1">
													<Wind className="h-3 w-3" /> AUTO
												</span>
												<Button
													variant="outline"
													size="icon"
													onClick={() =>
														setTargetTemp((t) => Math.min(30, t + 1))
													}
													className="h-7 w-7 rounded-full border-border bg-muted"
												>
													<Plus className="h-3.5 w-3.5" />
												</Button>
											</div>
										</CardContent>
									</Card>

									{/* Workstation */}
									<Card className="bg-card border-border relative overflow-hidden shadow-none">
										<CardHeader className="flex flex-row items-center justify-between pb-2">
											<div className="flex items-center gap-2">
												<Zap className="h-4 w-4 text-primary" />
												<CardTitle className="text-sm font-semibold text-foreground">
													Workstation
												</CardTitle>
											</div>
											<MockSwitch
												checked={isPlugOn}
												onCheckedChange={setIsPlugOn}
											/>
										</CardHeader>
										<CardContent className="space-y-1">
											<span className="font-mono text-[10px] uppercase text-muted-foreground/70 tracking-wider">
												Current Draw
											</span>
											<p className="text-2xl font-light text-foreground">
												{isPlugOn ? 385 : 0}{" "}
												<span className="text-xs font-mono text-muted-foreground/60">
													W
												</span>
											</p>
											<svg
												className="w-full h-8 mt-1 text-primary opacity-50"
												preserveAspectRatio="none"
												viewBox="0 0 100 20"
												aria-hidden="true"
											>
												<path
													d="M0 15 L20 12 L40 18 L60 8 L80 14 L100 5"
													fill="none"
													stroke="currentColor"
													strokeLinejoin="round"
													strokeWidth="1.5"
												/>
											</svg>
										</CardContent>
									</Card>
								</div>
							</div>

							{/* AUTOMAÇÕES ATIVAS — cresce (flex-1) pra fechar a altura com a coluna da direita */}
							<Card className="bg-card/80 border-border shadow-none flex-1 flex flex-col">
								<CardHeader className="pb-2">
									<CardTitle className="text-[11px] font-mono font-bold uppercase tracking-wider text-foreground">
										Automações Ativas
									</CardTitle>
								</CardHeader>
								<CardContent className="flex-1 flex flex-col justify-center gap-2">
									<div className="flex items-center justify-between p-2.5 rounded-lg bg-muted border border-border">
										<div className="flex items-center gap-2">
											<Radio className="h-3.5 w-3.5 text-primary" />
											<div>
												<p className="text-xs font-medium text-foreground">
													Rotina da Manhã
												</p>
												<span className="text-[10px] font-mono text-muted-foreground/60">
													Persianas 50% • 07:00
												</span>
											</div>
										</div>
										<Badge
											variant="outline"
											className="text-[9px] font-mono text-primary border-primary/30"
										>
											ATIVA
										</Badge>
									</div>
									<div className="flex items-center justify-between p-2.5 rounded-lg bg-muted border border-border">
										<div className="flex items-center gap-2">
											<Moon className="h-3.5 w-3.5 text-muted-foreground" />
											<div>
												<p className="text-xs font-medium text-foreground">
													Modo Fora de Casa
												</p>
												<span className="text-[10px] font-mono text-muted-foreground/60">
													Geofence • ao sair
												</span>
											</div>
										</div>
										<Badge
											variant="outline"
											className="text-[9px] font-mono text-muted-foreground border-border"
										>
											PAUSADA
										</Badge>
									</div>
								</CardContent>
							</Card>
						</div>

						{/* RIGHT 4 COLS: CAMERA + MUSIC PLAYER + ACTIVITY LOG (preenche a altura toda, sem sobra) */}
						<div className="lg:col-span-4 flex flex-col gap-5">
							{/* CAMERA FEED */}
							<Card className="bg-card border-border shadow-none overflow-hidden p-0">
								<div className="flex items-center gap-2 px-3 py-2 border-b border-border">
									<Shield className="h-3.5 w-3.5 text-[#ffb4ab]" />
									<span className="text-xs font-semibold text-foreground">
										Aether Secure
									</span>
								</div>
								<div className="relative aspect-video bg-[#0a0a0a] grayscale overflow-hidden">
									<div
										className="absolute inset-0 opacity-30"
										style={{
											backgroundImage:
												"repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)",
										}}
									/>
									<div className="absolute inset-0 flex items-center justify-center text-white/15">
										<Video className="h-9 w-9" />
									</div>
									<div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded">
										<span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
										<span className="font-mono text-[8px] text-white font-bold tracking-widest">
											LIVE
										</span>
									</div>
								</div>
							</Card>

							{/* MUSIC PLAYER */}
							<Card className="bg-card border-border shadow-none">
								<CardHeader className="pb-3 flex flex-row items-center justify-between">
									<div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
										<Disc className="h-4 w-4 text-emerald-400 animate-[spin_8s_linear_infinite]" />
										<span>SPOTIFY CONNECT</span>
									</div>
									<Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] font-mono">
										{isSpotifyPlaying ? "TOCANDO" : "PAUSADO"}
									</Badge>
								</CardHeader>

								<CardContent className="space-y-3">
									<div className="flex gap-3 items-center">
										<div className="w-12 h-12 rounded-lg bg-muted border border-border shrink-0 flex items-center justify-center overflow-hidden">
											<Disc className="h-6 w-6 text-muted-foreground/50" />
										</div>
										<div className="min-w-0 flex-1">
											<h4 className="text-sm font-semibold text-foreground truncate">
												Stop Crying Your Heart Out
											</h4>
											<p className="text-xs text-muted-foreground truncate">
												Oasis
											</p>
										</div>
									</div>

									<div className="space-y-2 pt-2 border-t border-border">
										<div className="flex items-center gap-2">
											<Volume2 className="h-3.5 w-3.5 text-muted-foreground/70" />
											<Slider
												value={spotifyVolume}
												onValueChange={setSpotifyVolume}
												max={100}
												step={1}
												className="w-full"
											/>
										</div>

										<div className="flex justify-center items-center gap-4 pt-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-foreground"
											>
												<SkipBack className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												onClick={() => setIsSpotifyPlaying((v) => !v)}
												className="h-9 w-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black"
											>
												{isSpotifyPlaying ? (
													<Pause className="h-4 w-4 fill-current" />
												) : (
													<Play className="h-4 w-4 fill-current" />
												)}
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground hover:text-foreground"
											>
												<SkipForward className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* ACTIVITY LOG — cresce (flex-1) pra fechar a altura com a coluna da esquerda, qual for a mais curta */}
							<Card className="bg-card border-border shadow-none flex-1 flex flex-col">
								<CardHeader className="pb-3 flex flex-row items-center gap-2">
									<Activity className="h-3.5 w-3.5 text-muted-foreground" />
									<CardTitle className="text-xs font-mono uppercase tracking-wider text-foreground">
										Activity Log
									</CardTitle>
								</CardHeader>

								<CardContent className="flex-1 flex flex-col justify-between gap-4">
									<div className="relative pl-4 space-y-4 before:absolute before:left-[5px] before:top-2 before:bottom-2 before:w-px before:bg-border">
										<div className="relative flex items-start gap-3">
											<span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-[#d3c4b8] ring-4 ring-card" />
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium text-foreground">
													Power Spike Detected
												</p>
												<span className="text-[11px] text-muted-foreground/70 block">
													Carga excedeu 3.2kW
												</span>
												<span className="text-[9px] font-mono text-muted-foreground/50">
													3 min ago
												</span>
											</div>
										</div>

										<div className="relative flex items-start gap-3">
											<span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-card" />
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium text-foreground">
													Front Door Secured
												</p>
												<span className="text-[11px] text-muted-foreground/70 block">
													Trava automática via geofence
												</span>
												<span className="text-[9px] font-mono text-muted-foreground/50">
													18 min ago
												</span>
											</div>
										</div>

										<div className="relative flex items-start gap-3">
											<span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-primary ring-4 ring-card" />
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium text-foreground">
													Scene Activated
												</p>
												<span className="text-[11px] text-muted-foreground/70 block">
													Evening • 4 dispositivos
												</span>
												<span className="text-[9px] font-mono text-muted-foreground/50">
													32 min ago
												</span>
											</div>
										</div>

										<div className="relative flex items-start gap-3 opacity-70">
											<span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-muted-foreground ring-4 ring-card" />
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium text-foreground">
													System Update
												</p>
												<span className="text-[11px] text-muted-foreground/70 block">
													Aether OS v4.2.0 instalado
												</span>
												<span className="text-[9px] font-mono text-muted-foreground/50">
													1h ago
												</span>
											</div>
										</div>

										<div className="relative flex items-start gap-3">
											<span className="absolute -left-[15px] top-1.5 h-2 w-2 rounded-full bg-emerald-400 ring-4 ring-card" />
											<div className="min-w-0 flex-1">
												<p className="text-xs font-medium text-foreground">
													Grid Sync Completed
												</p>
												<span className="text-[11px] text-muted-foreground/70 block">
													Telemetria reconciliada
												</span>
												<span className="text-[9px] font-mono text-muted-foreground/50">
													2h ago
												</span>
											</div>
										</div>
									</div>

									<Button
										variant="outline"
										className="w-full h-8 text-[11px] font-mono bg-muted border-border text-muted-foreground hover:text-foreground"
									>
										VIEW FULL LOG
									</Button>
								</CardContent>
							</Card>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
