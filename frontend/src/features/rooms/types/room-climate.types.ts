/**
 * Espelha `RoomClimateResponseDto` (GetRoomClimateQuery.cs). hasClimateSensor
 * indica se existe algum Sensor/Termostato no ambiente — quando falso, as
 * outras leituras vêm sempre nulas e a seção de clima deve ser omitida por
 * completo (sem espaço reservado), não só mostrar "--".
 */
export interface RoomClimate {
	hasClimateSensor: boolean;
	temperatureCelsius: number | null;
	humidityPercent: number | null;
	readingTimestampUtc: string | null;
}
