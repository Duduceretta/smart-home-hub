export interface DashboardSummary {
	totalDevicesCount: number;
	onlineDevicesCount: number;
	energyConsumptionKwh: number;
	/**
	 * true se algum dispositivo somado aqui não tem sensor de energia real
	 * (ex: TV controlada via ADB/Cast) e entrou com potência estimada por
	 * média típica do aparelho, não medição real.
	 */
	isEnergyEstimated: boolean;
	averageTemperatureCelsius: number;
	temperatureTrend: number;
	activeAlertsCount: number;
}

export interface EnergyChartPoint {
	timestamp: string;
	value: number;
	isEstimated: boolean;
}

/**
 * roomId nulo = bucket "Sem Ambiente" (dispositivos sem cômodo atribuído).
 */
export interface RoomEnergyUsage {
	roomId: string | null;
	value: number;
	isEstimated: boolean;
}

export interface RecentEvent {
	id: string;
	timestamp: string;
	title: string;
	description: string;
	eventType: "Climate" | "Lighting" | "Security" | "System" | string;
}

export interface DashboardOverviewResponse {
	summary: DashboardSummary;
	energyChart: EnergyChartPoint[];
	roomUsage: RoomEnergyUsage[];
	/**
	 * Não consumido pela UI — a Linha do Tempo usa o endpoint dedicado e
	 * paginado `GET /api/dashboard/activity-log` (ver `useActivityLog`).
	 * Mantido no contrato porque o backend ainda retorna o campo.
	 */
	recentActivities: RecentEvent[];
}

/**
 * Espelha `ActivityEventTypes` em
 * `Features/Dashboards/ActivityLog/ActivityLogMessages.cs` (backend).
 */
export type ActivityEventType =
	| "DeviceStatus"
	| "DeviceMedia"
	| "Spotify"
	| "AutomationExecuted";

/**
 * Entrada real da Linha do Tempo — persistida como SystemEvent no backend,
 * servida por `GET /api/dashboard/activity-log`.
 */
export interface ActivityLogEntry {
	id: string;
	deviceId: string | null;
	eventType: ActivityEventType;
	title: string;
	description: string;
	timestamp: string;
	/** true = execução de automação que falhou (ou outro evento marcado como alerta). */
	isAlert: boolean;
}

/**
 * Recorte mínimo de `Automation` (feature `automations`) pro card de
 * automações do dashboard — cópia local dos campos usados, não um import
 * cross-feature (regra de ouro do FSD: features nunca importam tipos/hooks
 * umas das outras diretamente). `lastExecutedAt` já é dado real (o backend
 * registra execução via SystemEvent/AutomationExecuted); `updatedAt`
 * continua como fallback pra automações que nunca chegaram a executar.
 */
export interface DashboardAutomationSummary {
	id: string;
	name: string;
	isActive: boolean;
	rulePayload?: string;
	updatedAt: string | null;
	createdAt: string;
	lastExecutedAt: string | null;
}
