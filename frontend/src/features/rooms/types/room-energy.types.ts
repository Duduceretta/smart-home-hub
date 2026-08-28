export type RoomEnergyRange = "24h" | "7d";

/**
 * Espelha `RoomEnergyChartPointDto`/`RoomEnergyResponseDto`
 * (GetRoomEnergyQuery.cs). `value` é potência MÉDIA (kW) do balde de 5min,
 * já somando só os dispositivos deste ambiente.
 */
export interface RoomEnergyChartPoint {
	timestamp: string;
	value: number;
	isEstimated: boolean;
}

export interface RoomEnergy {
	hasEnergyData: boolean;
	chart: RoomEnergyChartPoint[];
	totalConsumptionKwh: number;
	isEnergyEstimated: boolean;
}
