import {
	Activity,
	AirVent,
	BadgeAlert,
	Cpu,
	Fan,
	History,
	Layers,
	LayoutDashboard,
	LayoutGrid,
	Lightbulb,
	List,
	MoreVertical,
	Pause,
	Plus,
	Power,
	Radio,
	Router,
	Search,
	SkipBack,
	SkipForward,
	Snowflake,
	SunMedium,
	Thermometer,
	Tv,
	User,
	Volume2,
	VolumeX,
	Zap,
} from "lucide-react";
import { type CSSProperties, useState } from "react";
import { Badge } from "@/core/components/ui/badge";
// Componentes shadcn/ui
import { Button } from "@/core/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { Input } from "@/core/components/ui/input";
import { Progress } from "@/core/components/ui/progress";
import { Slider } from "@/core/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/core/components/ui/tabs";

/**
 * Paleta exata do protótipo HTML (Material 3 dark warm surface) enviado
 * pelo usuário, escopada só a este preview via CSS custom properties —
 * não altera o tema global do app em src/app/styles/index.css.
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

export default function DevicesDashboard() {
	const [lampBrightness, setLampBrightness] = useState([80]);
	const [targetTemp, setTargetTemp] = useState(22);
	const [volume, setVolume] = useState([45]);
	const [isPlaying, setIsPlaying] = useState(false);
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	return (
		<div
			className="flex min-h-screen bg-linear-to-b from-[#1c1b1c] to-background text-foreground"
			style={mockThemeVars}
		>
			{/* Sidebar Lateral */}
			<aside className="fixed left-0 top-0 h-full w-72 border-r border-border bg-linear-to-b from-card/70 to-card/40 backdrop-blur-xl z-50 flex flex-col justify-between p-6">
				<div className="space-y-8">
					{/* Brand Logo */}
					<div className="flex items-center gap-3">
						<div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
							<Cpu className="h-5 w-5" />
						</div>
						<span className="font-semibold text-lg tracking-tight">
							CORE OS
						</span>
					</div>

					{/* Navigation Links */}
					<nav className="space-y-1.5">
						<Button
							variant="ghost"
							className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
						>
							<LayoutDashboard className="h-4 w-4" />
							Dashboard
						</Button>
						<Button
							variant="secondary"
							className="w-full justify-start gap-3 font-medium bg-secondary text-secondary-foreground shadow-sm"
						>
							<Zap className="h-4 w-4 text-primary" />
							Dispositivos
						</Button>
						<Button
							variant="ghost"
							className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
						>
							<Thermometer className="h-4 w-4" />
							Ambientes
						</Button>
						<Button
							variant="ghost"
							className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
						>
							<Layers className="h-4 w-4" />
							Grupos
						</Button>
						<Button
							variant="ghost"
							className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
						>
							<Radio className="h-4 w-4" />
							Automações
						</Button>
						<Button
							variant="ghost"
							className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
						>
							<History className="h-4 w-4" />
							Histórico
						</Button>
					</nav>
				</div>

				{/* System Load Widget */}
				<Card className="bg-linear-to-br from-muted/50 to-muted/25 border-border/60">
					<CardContent className="p-4 space-y-3">
						<div className="flex items-center justify-between text-xs font-semibold tracking-wider uppercase text-muted-foreground">
							<span>Carga do Sistema</span>
							<span className="text-primary font-bold">12%</span>
						</div>
						<Progress value={12} className="h-1.5 bg-muted" />
					</CardContent>
				</Card>
			</aside>

			{/* Main Content Area */}
			<div className="pl-72 flex-1 flex flex-col min-w-0">
				{/* Top Header */}
				<header className="sticky top-0 z-40 h-16 border-b border-border bg-linear-to-b from-card/70 to-background/80 backdrop-blur-xl px-8 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/80 border border-border text-xs font-medium text-secondary-foreground">
							<span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
							HUB 01 ONLINE
						</div>
					</div>

					<div className="flex items-center gap-4">
						<div className="flex items-center text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground">
							<span className="text-foreground">PT</span>
							<span className="mx-1 text-border">/</span>
							<span>EN</span>
						</div>
						<Button
							variant="outline"
							size="icon"
							className="h-9 w-9 rounded-full relative"
						>
							<span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
							<Activity className="h-4 w-4 text-muted-foreground" />
						</Button>
						<Button
							variant="secondary"
							size="icon"
							className="h-9 w-9 rounded-full border border-border"
						>
							<User className="h-4 w-4" />
						</Button>
					</div>
				</header>

				{/* Dashboard Content */}
				<main className="p-8 space-y-8 flex-1">
					{/* Header Title & CTA */}
					<div className="flex items-center justify-between">
						<div className="space-y-1">
							<h1 className="text-3xl font-bold tracking-tight">
								Dispositivos
							</h1>
							<p className="text-sm text-muted-foreground">
								Gerencie conexões, consumo e estados dos periféricos integrados.
							</p>
						</div>
						<Button className="gap-2 rounded-full shadow-md hover:shadow-lg transition-all">
							<Plus className="h-4 w-4" />
							Novo Dispositivo
						</Button>
					</div>

					{/* Quick Metrics Bar */}
					<div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
						<button
							type="button"
							className="flex shrink-0 items-center gap-2 rounded-full bg-linear-to-b from-card to-card/70 px-4 py-2 shadow-sm transition-colors hover:bg-[#3a3939]"
						>
							<Lightbulb
								className="h-4 w-4 text-[#d3c4b8]"
								fill="currentColor"
							/>
							<span className="text-sm font-medium">3 Luzes Acesas</span>
						</button>
						<button
							type="button"
							className="flex shrink-0 items-center gap-2 rounded-full bg-linear-to-b from-card to-card/70 px-4 py-2 shadow-sm transition-colors hover:bg-[#3a3939]"
						>
							<Zap className="h-4 w-4 text-primary" fill="currentColor" />
							<span className="text-sm font-medium">540W Consumo</span>
						</button>
						<button
							type="button"
							className="flex shrink-0 items-center gap-2 rounded-full bg-linear-to-b from-card to-card/70 px-4 py-2 shadow-sm transition-colors hover:bg-[#3a3939]"
						>
							<Snowflake
								className="h-4 w-4 text-[#c4c6d2]"
								fill="currentColor"
							/>
							<span className="text-sm font-medium">23°C Clima</span>
						</button>
						<button
							type="button"
							className="flex shrink-0 items-center gap-2 rounded-full border border-destructive/50 bg-destructive/20 px-4 py-2 text-destructive shadow-sm transition-colors hover:bg-destructive/30"
						>
							<BadgeAlert className="h-4 w-4" fill="currentColor" />
							<span className="text-sm font-medium">1 Offline</span>
						</button>
					</div>

					{/* Filters & Search Toolbar */}
					<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
						<Tabs defaultValue="all" className="w-full sm:w-auto">
							<TabsList className="bg-muted/60 p-1 rounded-full">
								<TabsTrigger value="all" className="rounded-full text-xs px-4">
									Todos
								</TabsTrigger>
								<TabsTrigger
									value="living"
									className="rounded-full text-xs px-4"
								>
									🛋️ Sala
								</TabsTrigger>
								<TabsTrigger
									value="bedroom"
									className="rounded-full text-xs px-4"
								>
									🛏️ Quarto
								</TabsTrigger>
								<TabsTrigger
									value="kitchen"
									className="rounded-full text-xs px-4"
								>
									🍳 Cozinha
								</TabsTrigger>
								<TabsTrigger
									value="outdoor"
									className="rounded-full text-xs px-4"
								>
									🌿 Externo
								</TabsTrigger>
							</TabsList>
						</Tabs>

						<div className="flex items-center gap-3">
							<div className="relative w-44 transition-all duration-300 focus-within:w-60">
								<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder="Buscar..."
									className="w-full pl-9 pr-12 rounded-full bg-muted border-none"
								/>
								<kbd className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-card px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
									⌘K
								</kbd>
							</div>

							<div className="flex items-center gap-1 rounded-lg bg-muted p-1">
								<button
									type="button"
									aria-pressed={viewMode === "grid"}
									onClick={() => setViewMode("grid")}
									className={`rounded p-1.5 transition-colors ${
										viewMode === "grid"
											? "bg-card text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									<LayoutGrid className="h-4 w-4" />
								</button>
								<button
									type="button"
									aria-pressed={viewMode === "list"}
									onClick={() => setViewMode("list")}
									className={`rounded p-1.5 transition-colors ${
										viewMode === "list"
											? "bg-card text-foreground shadow-sm"
											: "text-muted-foreground hover:text-foreground"
									}`}
								>
									<List className="h-4 w-4" />
								</button>
							</div>
						</div>
					</div>

					{/* Device Grid / List */}
					{viewMode === "list" ? (
						<DeviceListView
							lampBrightness={lampBrightness[0]}
							targetTemp={targetTemp}
						/>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
							{/* Card: Lâmpada Principal */}
							<Card className="relative overflow-hidden bg-linear-to-br from-card to-card/60 border-border hover:border-primary/40 transition-all hover:shadow-md">
								<div className="absolute inset-0 bg-linear-to-br from-[#d3c4b8]/10 to-transparent pointer-events-none" />
								<CardHeader className="relative z-10 flex flex-row items-start justify-between pb-3">
									<div className="flex items-center gap-3">
										<button
											type="button"
											className="h-11 w-11 rounded-full bg-[#d3c4b8] flex items-center justify-center text-[#382f27] shadow-[0_0_8px_rgba(211,196,184,0.2)] transition-transform hover:scale-105"
										>
											<Lightbulb className="h-5 w-5" />
										</button>
										<div>
											<CardTitle className="text-base font-semibold">
												Lâmpada Principal
											</CardTitle>
											<p className="text-[11px] font-semibold tracking-wider text-[#d3c4b8] uppercase">
												Sala • Zigbee
											</p>
										</div>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem>Configurações</DropdownMenuItem>
											<DropdownMenuItem>Desligar</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardHeader>
								<CardContent className="relative z-10 space-y-4 pt-2">
									<div className="flex justify-between items-center text-sm font-medium">
										<span className="text-muted-foreground flex items-center gap-1.5">
											<SunMedium className="h-4 w-4" /> Brilho
										</span>
										<span className="font-semibold">{lampBrightness}%</span>
									</div>
									<Slider
										value={lampBrightness}
										onValueChange={setLampBrightness}
										max={100}
										step={1}
										className="py-1"
									/>
								</CardContent>
							</Card>

							{/* Card: Tomada Inteligente */}
							<Card className="relative overflow-hidden bg-linear-to-br from-card to-card/60 border-border hover:border-primary/40 transition-all hover:shadow-md">
								<div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent pointer-events-none" />
								<CardHeader className="relative z-10 flex flex-row items-start justify-between pb-3">
									<div className="flex items-center gap-3">
										<button
											type="button"
											className="h-11 w-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_8px_rgba(197,198,207,0.2)] transition-transform hover:scale-105"
										>
											<Zap className="h-5 w-5" />
										</button>
										<div>
											<CardTitle className="text-base font-semibold">
												Tomada Inteligente
											</CardTitle>
											<p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
												Cozinha • Wi-Fi
											</p>
										</div>
									</div>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button
												variant="ghost"
												size="icon"
												className="h-8 w-8 text-muted-foreground"
											>
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem>Configurações</DropdownMenuItem>
											<DropdownMenuItem>Desligar</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</CardHeader>
								<CardContent className="relative z-10 space-y-4 pt-2">
									<div className="flex justify-between items-baseline">
										<span className="text-sm text-muted-foreground">
											Consumo Atual
										</span>
										<div className="text-right">
											<span className="text-2xl font-bold tracking-tight">
												120
											</span>
											<span className="text-xs font-semibold text-primary ml-1">
												W
											</span>
										</div>
									</div>
									<div className="flex justify-between items-center pt-2 border-t border-border/60 text-sm">
										<span className="text-muted-foreground">
											Tensão Nominal
										</span>
										<span className="font-medium text-foreground">127V</span>
									</div>
								</CardContent>
							</Card>

							{/* Card: Interruptor Desligado */}
							<Card className="relative overflow-hidden bg-muted/20 border-border/70">
								<CardHeader className="flex flex-row items-start justify-between pb-3">
									<div className="flex items-center gap-3">
										<div className="h-11 w-11 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground">
											<Power className="h-5 w-5" />
										</div>
										<div>
											<CardTitle className="text-base font-semibold text-muted-foreground">
												Interruptor
											</CardTitle>
											<p className="text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
												Corredor • Z-Wave
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</CardHeader>
								<CardContent className="flex justify-between items-center pt-6">
									<span className="text-sm text-muted-foreground">Estado</span>
									<Badge
										variant="outline"
										className="font-semibold text-[10px] tracking-wider text-muted-foreground uppercase"
									>
										Desligado
									</Badge>
								</CardContent>
							</Card>

							{/* Card: Repetidor Wi-Fi (Offline) */}
							<Card className="relative overflow-hidden bg-card/70 border-border">
								<CardHeader className="flex flex-row items-start justify-between pb-3">
									<div className="flex items-center gap-3">
										<div className="h-11 w-11 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
											<Router className="h-5 w-5" />
										</div>
										<div>
											<CardTitle className="text-base font-semibold text-muted-foreground">
												Repetidor Wi-Fi
											</CardTitle>
											<p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
												Externo • Wi-Fi
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</CardHeader>
								<CardContent className="space-y-4 pt-2">
									<Badge
										variant="outline"
										className="font-semibold text-[10px] tracking-wider text-muted-foreground uppercase"
									>
										Sem Conexão
									</Badge>
									<div className="flex justify-between items-center pt-2 border-t border-border/60 text-sm">
										<span className="text-muted-foreground">
											Visto por último
										</span>
										<span className="font-medium text-muted-foreground">
											Há 2 horas
										</span>
									</div>
								</CardContent>
							</Card>

							{/* Card 5: Smart TV (Largura Dupla) */}
							<Card className="col-span-1 md:col-span-2 relative overflow-hidden bg-linear-to-br from-card to-card/60 border-border">
								<div className="absolute right-0 top-0 w-64 h-full bg-linear-to-l from-primary/5 to-transparent pointer-events-none" />
								<CardHeader className="relative z-10 flex flex-row items-start justify-between pb-2">
									<div className="flex items-center gap-3">
										<button
											type="button"
											className="h-11 w-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-[0_0_8px_rgba(197,198,207,0.2)] transition-transform hover:scale-105"
										>
											<Tv className="h-5 w-5" />
										</button>
										<div>
											<CardTitle className="text-base font-semibold">
												Smart TV LG OLED
											</CardTitle>
											<p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
												Sala • Ethernet
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<span className="flex h-2 w-2 relative">
											<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
											<span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
										</span>
										<span className="text-[11px] font-bold tracking-wider text-primary uppercase">
											Reproduzindo
										</span>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground ml-1"
										>
											<MoreVertical className="h-4 w-4" />
										</Button>
									</div>
								</CardHeader>
								<CardContent className="relative z-10 space-y-4 pt-2">
									{/* Mini Player */}
									<div className="flex items-center gap-3 rounded-lg bg-muted/40 p-2.5 border border-border/50">
										<div className="h-12 w-12 rounded-md bg-secondary flex items-center justify-center overflow-hidden shrink-0">
											<img
												src="https://images.unsplash.com/photo-1534447677768-be436bb09401?w=150&auto=format&fit=crop&q=60"
												alt="Album art"
												className="h-full w-full object-cover"
											/>
										</div>
										<div className="flex-1 min-w-0">
											<h4 className="text-sm font-semibold truncate">
												Blade Runner 2049
											</h4>
											<p className="text-xs text-muted-foreground truncate">
												Plex Media Server
											</p>
										</div>
										<div className="flex items-center gap-1">
											<Button variant="ghost" size="icon" className="h-8 w-8">
												<SkipBack className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												className="h-8 w-8 rounded-full shadow-sm"
												onClick={() => setIsPlaying(!isPlaying)}
											>
												<Pause className="h-4 w-4 fill-current" />
											</Button>
											<Button variant="ghost" size="icon" className="h-8 w-8">
												<SkipForward className="h-4 w-4" />
											</Button>
										</div>
									</div>

									{/* Volume Slider */}
									<div className="flex items-center gap-3">
										<VolumeX className="h-4 w-4 text-muted-foreground" />
										<Slider
											value={volume}
											onValueChange={setVolume}
											max={100}
											className="flex-1 py-1"
										/>
										<Volume2 className="h-4 w-4 text-muted-foreground" />
									</div>
								</CardContent>
							</Card>

							{/* Card 6: Ar-Condicionado (Largura Dupla) */}
							<Card className="col-span-1 md:col-span-2 relative overflow-hidden bg-linear-to-br from-card to-card/60 border-border">
								<div className="absolute left-0 top-0 w-64 h-full bg-linear-to-r from-[#c4c6d2]/5 to-transparent pointer-events-none" />
								<CardHeader className="relative z-10 flex flex-row items-start justify-between pb-2">
									<div className="flex items-center gap-3">
										<button
											type="button"
											className="h-11 w-11 rounded-full bg-[#c4c6d2] flex items-center justify-center text-[#2d303a] shadow-[0_0_8px_rgba(196,198,210,0.2)] transition-transform hover:scale-105"
										>
											<AirVent className="h-5 w-5" />
										</button>
										<div>
											<CardTitle className="text-base font-semibold">
												Ar-Condicionado
											</CardTitle>
											<p className="text-[11px] font-semibold tracking-wider text-[#c4c6d2] uppercase">
												Quarto • Infravermelho
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-8 w-8 text-muted-foreground"
									>
										<MoreVertical className="h-4 w-4" />
									</Button>
								</CardHeader>
								<CardContent className="relative z-10 flex items-center justify-between pt-2">
									<div>
										<span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
											Temperatura Alvo
										</span>
										<div className="flex items-baseline gap-1 mt-0.5">
											<span className="text-4xl font-extrabold tracking-tight">
												{targetTemp}
											</span>
											<span className="text-lg font-medium text-[#c4c6d2]">
												°C
											</span>
										</div>
									</div>

									{/* Controls */}
									<div className="flex items-center gap-3">
										<div className="flex flex-col gap-1.5">
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8 rounded-full border-border"
												onClick={() =>
													setTargetTemp((t) => Math.min(30, t + 1))
												}
											>
												<Plus className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8 rounded-full border-border"
												onClick={() =>
													setTargetTemp((t) => Math.max(16, t - 1))
												}
											>
												<span className="text-base font-bold leading-none">
													-
												</span>
											</Button>
										</div>

										<div className="flex flex-col gap-1.5">
											<Button
												variant="secondary"
												size="icon"
												className="h-8 w-8 rounded-full bg-[#c4c6d2]/20 text-[#c4c6d2] hover:bg-[#c4c6d2]/30"
											>
												<Snowflake className="h-4 w-4" />
											</Button>
											<Button
												variant="outline"
												size="icon"
												className="h-8 w-8 rounded-full border-border text-muted-foreground"
											>
												<Fan className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

interface DeviceListItem {
	icon: typeof Lightbulb;
	name: string;
	subtitle: string;
	state: string;
	accentColor: string;
	offline?: boolean;
}

function DeviceListView({
	lampBrightness,
	targetTemp,
}: {
	lampBrightness: number;
	targetTemp: number;
}) {
	const items: DeviceListItem[] = [
		{
			icon: Lightbulb,
			name: "Lâmpada Principal",
			subtitle: "Sala • Zigbee",
			state: `${lampBrightness}%`,
			accentColor: "#d3c4b8",
		},
		{
			icon: Zap,
			name: "Tomada Inteligente",
			subtitle: "Cozinha • Wi-Fi",
			state: "120W",
			accentColor: "#c5c6cf",
		},
		{
			icon: Power,
			name: "Interruptor",
			subtitle: "Corredor • Z-Wave",
			state: "Desligado",
			accentColor: "#c7c6cb",
		},
		{
			icon: Router,
			name: "Repetidor Wi-Fi",
			subtitle: "Externo • Wi-Fi",
			state: "Há 2 horas",
			accentColor: "#c7c6cb",
			offline: true,
		},
		{
			icon: Tv,
			name: "Smart TV LG OLED",
			subtitle: "Sala • Ethernet",
			state: "Reproduzindo",
			accentColor: "#c5c6cf",
		},
		{
			icon: AirVent,
			name: "Ar-Condicionado",
			subtitle: "Quarto • Infravermelho",
			state: `${targetTemp}°C`,
			accentColor: "#c4c6d2",
		},
	];

	return (
		<div className="flex flex-col gap-2">
			{items.map((item) => (
				<div
					key={item.name}
					className={`flex items-center gap-3.5 rounded-xl bg-linear-to-br from-card to-card/60 border border-border px-4 py-3 transition-colors hover:bg-card ${
						item.offline ? "opacity-60" : ""
					}`}
				>
					<div
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
						style={{
							backgroundColor: `${item.accentColor}1a`,
							color: item.accentColor,
						}}
					>
						<item.icon className="h-4 w-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-semibold">{item.name}</p>
						<p className="truncate text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
							{item.subtitle}
						</p>
					</div>
					<span className="shrink-0 text-sm font-medium text-muted-foreground">
						{item.state}
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8 shrink-0 text-muted-foreground"
					>
						<MoreVertical className="h-4 w-4" />
					</Button>
				</div>
			))}
		</div>
	);
}
