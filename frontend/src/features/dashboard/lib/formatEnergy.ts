interface FormattedValue<TUnit extends string> {
	value: string;
	unit: TUnit;
}

/**
 * Auto-escala energia acumulada (sempre recebida em kWh do backend) para Wh
 * quando o valor for pequeno — "0.006 kWh" é difícil de ler, "6 Wh" não.
 * Mesmo padrão usado em dashboards de energia residencial (Tesla, Nest).
 */
export function formatEnergy(kwh: number): FormattedValue<"Wh" | "kWh"> {
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

/**
 * Mesma escala, mas para potência instantânea (kW vindo do backend) — o
 * gráfico mostra "quanto a casa está puxando agora", não energia acumulada,
 * por isso a unidade não carrega o "h" de "por hora".
 */
export function formatPower(kw: number): FormattedValue<"W" | "kW"> {
	if (kw < 1) {
		const w = kw * 1000;
		return {
			value: w === 0 ? "0" : w < 10 ? w.toFixed(1) : Math.round(w).toString(),
			unit: "W",
		};
	}
	return { value: kw.toFixed(kw < 10 ? 2 : 1), unit: "kW" };
}
