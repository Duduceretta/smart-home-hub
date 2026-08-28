interface FormattedValue<TUnit extends string> {
	value: string;
	unit: TUnit;
}

/**
 * Mesma lógica de `dashboard/utils/formatEnergy.ts`, duplicada localmente
 * (isolamento do FSD, mesmo padrão de `get-relative-time.ts`) — auto-escala
 * kWh para Wh quando o valor for pequeno.
 */
export function formatRoomEnergy(kwh: number): FormattedValue<"Wh" | "kWh"> {
	if (kwh < 1) {
		const wh = kwh * 1000;
		return {
			value:
				wh === 0 ? "0" : wh < 10 ? wh.toFixed(1) : Math.round(wh).toString(),
			unit: "Wh",
		};
	}
	return { value: kwh.toFixed(kwh < 10 ? 2 : 1), unit: "kWh" };
}

export function formatRoomPower(kw: number): FormattedValue<"W" | "kW"> {
	if (kw < 1) {
		const w = kw * 1000;
		return {
			value: w === 0 ? "0" : w < 10 ? w.toFixed(1) : Math.round(w).toString(),
			unit: "W",
		};
	}
	return { value: kw.toFixed(kw < 10 ? 2 : 1), unit: "kW" };
}
