import { Droplets, Thermometer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/core/components/ui/button";
import { useRoomClimate } from "../../hooks/useRoomClimate";
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
	const { t } = useTranslation("rooms");
	const { data, isLoading, isError, refetch } = useRoomClimate(roomId);

	if (isLoading) {
		return (
			<div className="grid grid-cols-2 gap-4">
				{[0, 1].map((i) => (
					<div
						key={i}
						className="h-18.5 animate-pulse rounded-lg border border-border-subtle/20 bg-surface-high"
					/>
				))}
			</div>
		);
	}

	if (isError) {
		return (
			<div className="flex items-center justify-between rounded-lg border border-dashed border-border-subtle p-3 text-xs text-muted-foreground">
				<span>
					{t(
						"climate.errorLoad",
						"Não foi possível carregar o clima do ambiente.",
					)}
				</span>
				<Button variant="ghost" size="xs" onClick={() => refetch()}>
					{t("climate.retry", "Tentar de novo")}
				</Button>
			</div>
		);
	}

	if (!data?.hasClimateSensor) return null;

	return (
		<div className="grid grid-cols-2 gap-4">
			<RoomKpiCard
				icon={Thermometer}
				label={t("climate.temperature", "Temperatura")}
				value={
					data.temperatureCelsius !== null
						? `${data.temperatureCelsius}°C`
						: t("climate.noSensor", "Sem sensor")
				}
				accentClassName="text-foreground"
				isUnavailable={data.temperatureCelsius === null}
			/>
			<RoomKpiCard
				icon={Droplets}
				label={t("climate.humidity", "Umidade")}
				value={
					data.humidityPercent !== null
						? `${data.humidityPercent}%`
						: t("climate.noSensor", "Sem sensor")
				}
				accentClassName="text-foreground"
				isUnavailable={data.humidityPercent === null}
			/>
		</div>
	);
}
