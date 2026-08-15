import {
	Activity,
	Calendar,
	Cpu,
	Loader2,
	Radio,
	Thermometer,
	Wifi,
	Zap,
} from "lucide-react";
import { useState } from "react";
import {
	Area,
	AreaChart,
	CartesianGrid,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { useDeviceTelemetryHistory } from "../hooks/useDeviceTelemetryHistory";
import type { Device, TelemetryRange } from "../types/devices.types";

interface DeviceTelemetrySheetProps {
	device: Device | null;
	isOpen: boolean;
	onClose: () => void;
}

export const DeviceTelemetrySheet: React.FC<DeviceTelemetrySheetProps> = ({
	device,
	isOpen,
	onClose,
}) => {
	const [range, setRange] = useState<TelemetryRange>("24h");

	const { data, isLoading, isError } = useDeviceTelemetryHistory({
		deviceId: device?.id ?? null,
		range,
		enabled: isOpen && Boolean(device?.id),
	});

	if (!device) return null;

	const formatTimestamp = (utcString: string): string => {
		const date = new Date(utcString);
		return range === "24h"
			? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
			: date.toLocaleDateString([], { month: "short", day: "numeric" });
	};

	const chartData = (data?.points ?? []).map((point) => ({
		...point,
		formattedTime: formatTimestamp(point.timestamp),
	}));

	const latestPoint = chartData[chartData.length - 1];

	return (
		<SheetLayout
			isOpen={isOpen}
			onClose={onClose}
			title={device.name}
			description="Histórico de telemetria e métricas operacionais do sensor."
			footer={
				<div className="flex w-full items-center justify-between font-mono text-[11px] text-zinc-500">
					<span>ID: {device.externalId}</span>
					{device.ipAddress && <span>IP: {device.ipAddress}</span>}
				</div>
			}
		>
			<div className="space-y-5">
				{/* SEÇÃO 1: Status Operacional & Faixa Temporal */}
				<div className="space-y-2.5">
					<div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5 text-indigo-400">
						<div className="flex items-center gap-2">
							<Radio className="h-3.5 w-3.5" />
							<span className="text-[11px] font-bold uppercase tracking-wider">
								Status em Tempo Real
							</span>
						</div>

						{/* Seletor de Período */}
						<div className="flex items-center gap-1">
							<Calendar className="mr-1 h-3 w-3 text-zinc-500" />
							{(["24h", "7d", "30d"] as const).map((r) => (
								<button
									key={r}
									type="button"
									onClick={() => setRange(r)}
									className={`rounded px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
										range === r
											? "bg-indigo-600 text-white"
											: "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
									}`}
								>
									{r}
								</button>
							))}
						</div>
					</div>

					<div className="grid grid-cols-3 gap-2.5 pt-1">
						{/* Consumo */}
						<div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
							<div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-400">
								<Zap className="h-3.5 w-3.5" />
							</div>
							<p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
								Consumo
							</p>
							<p className="text-sm font-semibold text-zinc-100">
								{latestPoint?.powerUsageWatts !== undefined &&
								latestPoint.powerUsageWatts !== null
									? `${latestPoint.powerUsageWatts} W`
									: "--"}
							</p>
						</div>

						{/* Temperatura */}
						<div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
							<div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded bg-cyan-500/10 text-cyan-400">
								<Thermometer className="h-3.5 w-3.5" />
							</div>
							<p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
								Temp.
							</p>
							<p className="text-sm font-semibold text-zinc-100">
								{latestPoint?.temperatureCelsius !== undefined &&
								latestPoint.temperatureCelsius !== null
									? `${latestPoint.temperatureCelsius} °C`
									: "--"}
							</p>
						</div>

						{/* Tensão / Voltagem */}
						<div className="rounded-lg border border-zinc-800/80 bg-zinc-900/40 p-3">
							<div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded bg-emerald-500/10 text-emerald-400">
								<Wifi className="h-3.5 w-3.5" />
							</div>
							<p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
								Tensão
							</p>
							<p className="text-sm font-semibold text-zinc-100">
								{latestPoint?.voltage ? `${latestPoint.voltage} V` : "--"}
							</p>
						</div>
					</div>
				</div>

				{/* SEÇÃO 2: Curvas Históricas */}
				<div className="space-y-4 pt-1">
					<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
						<Cpu className="h-3.5 w-3.5" />
						<span className="text-[11px] font-bold uppercase tracking-wider">
							Séries Temporais
						</span>
					</div>

					{isLoading ? (
						<div className="flex h-52 flex-col items-center justify-center gap-2 text-zinc-500">
							<Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
							<p className="text-xs">Carregando telemetria...</p>
						</div>
					) : isError ? (
						<div className="rounded-lg border border-dashed border-rose-950/60 bg-rose-950/10 p-5 text-center text-xs text-rose-400">
							Não foi possível carregar os registros de telemetria.
						</div>
					) : chartData.length === 0 ? (
						<div className="flex h-52 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 p-6 text-center text-zinc-500">
							<Activity className="mb-2 h-6 w-6 stroke-1 text-zinc-600" />
							<p className="text-xs font-medium text-zinc-300">
								Sem registros para o período selecionado
							</p>
							<p className="mt-0.5 text-[11px] text-zinc-500">
								Eventos via MQTT preencherão o gráfico em tempo real.
							</p>
						</div>
					) : (
						<div className="space-y-5">
							{/* Gráfico 1: Consumo Watts */}
							<div className="space-y-1.5">
								<span className="text-[11px] font-medium text-zinc-400">
									Potência Ativa (Watts)
								</span>
								<div className="h-40 w-full rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2">
									<ResponsiveContainer width="100%" height="100%">
										<AreaChart data={chartData}>
											<defs>
												<linearGradient
													id="powerGrad"
													x1="0"
													y1="0"
													x2="0"
													y2="1"
												>
													<stop
														offset="5%"
														stopColor="#6366f1"
														stopOpacity={0.4}
													/>
													<stop
														offset="95%"
														stopColor="#6366f1"
														stopOpacity={0}
													/>
												</linearGradient>
											</defs>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#27272a"
												vertical={false}
											/>
											<XAxis
												dataKey="formattedTime"
												stroke="#71717a"
												fontSize={10}
												tickLine={false}
											/>
											<YAxis
												stroke="#71717a"
												fontSize={10}
												tickLine={false}
												axisLine={false}
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: "#18181b",
													borderColor: "#27272a",
													borderRadius: "0.375rem",
													color: "#f4f4f5",
													fontSize: "11px",
												}}
											/>
											<Area
												type="monotone"
												dataKey="powerUsageWatts"
												stroke="#6366f1"
												strokeWidth={2}
												fillOpacity={1}
												fill="url(#powerGrad)"
												name="Potência (W)"
											/>
										</AreaChart>
									</ResponsiveContainer>
								</div>
							</div>

							{/* Gráfico 2: Temperatura */}
							<div className="space-y-1.5">
								<span className="text-[11px] font-medium text-zinc-400">
									Temperatura (°C)
								</span>
								<div className="h-36 w-full rounded-lg border border-zinc-800/80 bg-zinc-900/30 p-2">
									<ResponsiveContainer width="100%" height="100%">
										<LineChart data={chartData}>
											<CartesianGrid
												strokeDasharray="3 3"
												stroke="#27272a"
												vertical={false}
											/>
											<XAxis
												dataKey="formattedTime"
												stroke="#71717a"
												fontSize={10}
												tickLine={false}
											/>
											<YAxis
												stroke="#71717a"
												fontSize={10}
												tickLine={false}
												axisLine={false}
											/>
											<Tooltip
												contentStyle={{
													backgroundColor: "#18181b",
													borderColor: "#27272a",
													borderRadius: "0.375rem",
													color: "#f4f4f5",
													fontSize: "11px",
												}}
											/>
											<Line
												type="monotone"
												dataKey="temperatureCelsius"
												stroke="#06b6d4"
												strokeWidth={2}
												dot={false}
												name="Temp (°C)"
											/>
										</LineChart>
									</ResponsiveContainer>
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</SheetLayout>
	);
};
