import {
	Bot,
	ChevronDown,
	Lightbulb,
	Lock,
	Play,
	ShieldAlert,
	Snowflake,
	Thermometer,
	Zap,
} from "lucide-react";
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Rectangle,
	type RectangleProps,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

// --- MOCK DATA ---
const energyData = [
	{ time: "00:00", value: 4.2 },
	{ time: "04:00", value: 3.1 },
	{ time: "08:00", value: 8.5 },
	{ time: "12:00", value: 12.4 },
	{ time: "16:00", value: 10.2 },
	{ time: "20:00", value: 15.8 },
	{ time: "23:59", value: 6.4 },
];

const roomData = [
	{ name: "Sala", value: 45 },
	{ name: "Cozinha", value: 30 },
	{ name: "Quartos", value: 25 },
];

const COLORS = ["#6366f1", "#a855f7", "#ec4899"]; // Indigo, Purple, Pink

export function DashboardPage() {
	return (
		<div className="flex flex-col gap-6 animate-fade-up">
			{/* CABEÇALHO */}
			<header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
				<div>
					<h1 className="text-3xl font-bold tracking-tight text-zinc-50">
						Visão Geral
					</h1>
					<p className="text-sm text-zinc-400 mt-1">
						Monitoramento do ecossistema em tempo real
					</p>
				</div>
				<button
					type="button"
					className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 transition-colors w-fit"
				>
					Últimas 24h
					<ChevronDown className="w-4 h-4" />
				</button>
			</header>

			{/* GRID DE KPIs (Métricas Principais) */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between relative overflow-hidden group">
					<div className="flex justify-between items-start relative z-10">
						<span className="text-sm font-medium text-zinc-400">
							Consumo de Energia
						</span>
						<Zap className="w-5 h-5 text-emerald-400" />
					</div>
					<div className="mt-4 relative z-10">
						<span className="text-3xl font-bold text-zinc-50">12.4</span>
						<span className="text-sm text-zinc-400 ml-1">kWh</span>
					</div>
					<div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-400/20">
						<div className="h-full bg-emerald-400 w-2/3"></div>
					</div>
				</div>

				<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(99,102,241,0.05)]">
					<div className="flex justify-between items-start">
						<span className="text-sm font-medium text-zinc-400">
							Dispositivos Online
						</span>
						<div className="relative flex h-3 w-3 mt-1">
							<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
							<span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
						</div>
					</div>
					<div className="mt-4">
						<span className="text-3xl font-bold text-zinc-50">14</span>
						<span className="text-sm text-zinc-400 ml-1">/ 16 ativos</span>
					</div>
				</div>

				<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
					<div className="flex justify-between items-start">
						<span className="text-sm font-medium text-zinc-400">
							Temperatura Média
						</span>
						<Thermometer className="w-5 h-5 text-orange-400" />
					</div>
					<div className="mt-4 flex items-end gap-2">
						<span className="text-3xl font-bold text-zinc-50">23°C</span>
						<span className="text-xs font-medium text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-full mb-1">
							-1°C
						</span>
					</div>
				</div>

				<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col justify-between">
					<div className="flex justify-between items-start">
						<span className="text-sm font-medium text-zinc-400">
							Alertas de Segurança
						</span>
						<ShieldAlert className="w-5 h-5 text-zinc-500" />
					</div>
					<div className="mt-4">
						<span className="text-3xl font-bold text-zinc-50">0</span>
						<span className="text-sm text-zinc-400 ml-1">alertas</span>
					</div>
				</div>
			</div>

			{/* SEÇÃO DO MEIO: CENAS RÁPIDAS E GRÁFICOS */}
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				{/* Gráfico de Área (Ocupa 3 colunas) */}
				<div className="lg:col-span-3 border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-6 flex flex-col">
					<h3 className="text-sm font-medium text-zinc-50 mb-6">
						Consumo de Energia (kW)
					</h3>
					<div className="flex-1 min-h-62.5 w-full">
						<ResponsiveContainer width="100%" height="100%">
							<AreaChart
								data={energyData}
								margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
							>
								<defs>
									<linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid
									strokeDasharray="3 3"
									stroke="#27272a"
									vertical={false}
								/>
								<XAxis
									dataKey="time"
									stroke="#71717a"
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<YAxis
									stroke="#71717a"
									fontSize={12}
									tickLine={false}
									axisLine={false}
								/>
								<Tooltip
									contentStyle={{
										backgroundColor: "#18181b",
										borderColor: "#27272a",
										borderRadius: "8px",
										color: "#f4f4f5",
									}}
									itemStyle={{ color: "#818cf8" }}
								/>
								<Area
									type="monotone"
									dataKey="value"
									stroke="#6366f1"
									strokeWidth={3}
									fillOpacity={1}
									fill="url(#colorValue)"
								/>
							</AreaChart>
						</ResponsiveContainer>
					</div>
				</div>

				{/* Coluna da Direita (Ocupa 1 coluna): Cenas e Gráfico de Barras */}
				<div className="lg:col-span-1 flex flex-col gap-6">
					{/* Cenas Rápidas (Para preencher a tela com ações úteis) */}
					<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-5">
						<h3 className="text-sm font-medium text-zinc-50 mb-4">
							Cenas Rápidas
						</h3>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-colors group"
							>
								<Play className="w-5 h-5 text-zinc-400 group-hover:text-indigo-400 mb-2" />
								<span className="text-xs font-medium text-zinc-300">
									Modo Filme
								</span>
							</button>
							<button
								type="button"
								className="flex flex-col items-center justify-center p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-colors group"
							>
								<Lock className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 mb-2" />
								<span className="text-xs font-medium text-zinc-300">
									Sair de Casa
								</span>
							</button>
						</div>
					</div>

					{/* Gráfico de Barras (Distribuição) */}
					<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm p-5 flex-1 flex flex-col">
						<h3 className="text-sm font-medium text-zinc-50 mb-4">
							Uso por Cômodo
						</h3>
						<div className="flex-1 min-h-30 w-full">
							<ResponsiveContainer width="100%" height="100%">
								<BarChart
									data={roomData}
									layout="vertical"
									margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
								>
									<XAxis type="number" hide />
									<YAxis
										dataKey="name"
										type="category"
										axisLine={false}
										tickLine={false}
										stroke="#a1a1aa"
										fontSize={12}
										width={60}
									/>
									<Tooltip
										cursor={{ fill: "#27272a" }}
										contentStyle={{
											backgroundColor: "#18181b",
											borderColor: "#27272a",
											borderRadius: "8px",
										}}
									/>
									<Bar
										dataKey="value"
										barSize={12}
										shape={(props: RectangleProps & { index: number }) => {
											const { index, ...rest } = props;
											return (
												<Rectangle
													{...rest}
													radius={[0, 4, 4, 0]}
													fill={COLORS[index % COLORS.length]}
												/>
											);
										}}
									/>
								</BarChart>
							</ResponsiveContainer>
						</div>
					</div>
				</div>
			</div>

			{/* SEÇÃO INFERIOR: Atividades Recentes */}
			<div className="border border-zinc-800/80 rounded-2xl bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
				<div className="p-6 border-b border-zinc-800/80">
					<h3 className="text-sm font-medium text-zinc-50">
						Atividades Recentes
					</h3>
				</div>
				<div className="divide-y divide-zinc-800/50">
					{[
						{
							icon: Snowflake,
							color: "text-indigo-400",
							bg: "bg-indigo-500/10",
							title: "Ar condicionado ligado",
							desc: "Sala de Estar • 22°C",
							time: "Há 5 min",
						},
						{
							icon: Lightbulb,
							color: "text-orange-400",
							bg: "bg-orange-500/10",
							title: "Luzes ajustadas",
							desc: "Quarto Principal • 70% brilho",
							time: "Há 12 min",
						},
						{
							icon: Lock,
							color: "text-emerald-400",
							bg: "bg-emerald-500/10",
							title: "Porta principal trancada",
							desc: "Rotina Noturna ativada",
							time: "Há 45 min",
						},
						{
							icon: Bot,
							color: "text-zinc-400",
							bg: "bg-zinc-800",
							title: "Limpeza concluída",
							desc: "Robô Aspirador • Cozinha",
							time: "Há 2 horas",
						},
					].map((item) => (
						<div
							key={item.title}
							className="p-4 md:p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors"
						>
							<div className="flex items-center gap-4">
								<div
									className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${item.bg}`}
								>
									<item.icon className={`w-5 h-5 ${item.color}`} />
								</div>
								<div>
									<p className="text-sm font-medium text-zinc-50">
										{item.title}
									</p>
									<p className="text-xs text-zinc-400">{item.desc}</p>
								</div>
							</div>
							<span className="text-xs text-zinc-500">{item.time}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
