import { Droplets, Thermometer } from "lucide-react";
import { Button } from "@/core/components/ui/button";
import { useRoomClimate } from "../hooks/useRoomClimate";
import { RoomKpiCard } from "./RoomKpiCard";

interface RoomClimateSectionProps {
	roomId: string;
}

/**
 * KPIs de Temperatura/Umidade — `GET /rooms/{id}/climate`.
 * hasClimateSensor=false omite a seção por completo (sem espaço reservado),
 * já que nem todo ambiente tem sensor/termostato.
 */
export function RoomClimateSection({ roomId }: RoomClimateSectionProps) {
	const { data, isLoading, isError, refetch } = useRoomClimate(roomId);

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4">
				{[0, 1].map((i) => (
					<div
						key={i}
						className="h-[74px] animate-pulse rounded-lg border border-border-subtle/20 bg-surface-container"
					/>
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-between rounded-lg border border-dashed border-border-subtle/40 p-3 text-xs text-muted-foreground">
				<span>Não foi possível carregar o clima do ambiente.</span>
				<Button variant="ghost" size="xs" onClick={() => refetch()}>
					Tentar de novo
				</Button>
			</div>
		);
	}

	if (!data?.hasClimateSensor) return null;

	return (
		<div className="grid grid-cols-2 gap-4">
			<RoomKpiCard
				icon={Thermometer}
				label="Temperatura"
				value={
					data.temperatureCelsius !== null
						? `${data.temperatureCelsius}°C`
						: "Sem sensor"
				}
				accentClassName="text-cool"
				isUnavailable={data.temperatureCelsius === null}
			/>
			<RoomKpiCard
				icon={Droplets}
				label="Umidade"
				value={
					data.humidityPercent !== null
						? `${data.humidityPercent}%`
						: "Sem sensor"
				}
				accentClassName="text-cool"
				isUnavailable={data.humidityPercent === null}
			/>
		</div>
	);
}
