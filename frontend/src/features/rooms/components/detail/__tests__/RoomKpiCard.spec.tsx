import { Thermometer } from "lucide-react";
import { describe, expect, it } from "vitest";
import { renderWithProviders, screen } from "@/testing/test-utils";
import { RoomKpiCard } from "../RoomKpiCard";

describe("RoomKpiCard Integration Tests", () => {
	it("RoomKpiCard_NormalValue_ShouldRenderLabelAndLargeValue", () => {
		// Act
		renderWithProviders(
			<RoomKpiCard
				icon={Thermometer}
				label="Temperatura"
				value="23°C"
				accentClassName="text-foreground"
			/>,
		);

		// Assert
		expect(screen.getByText("Temperatura")).toBeInTheDocument();
		expect(screen.getByText("23°C")).toBeInTheDocument();
	});

	it("RoomKpiCard_Unavailable_ShouldRenderValueAsDiscreetText", () => {
		// Act
		renderWithProviders(
			<RoomKpiCard
				icon={Thermometer}
				label="Umidade"
				value="Sem sensor"
				accentClassName="text-foreground"
				isUnavailable
			/>,
		);

		// Assert
		const value = screen.getByText("Sem sensor");
		expect(value).toBeInTheDocument();
		expect(value.className).toContain("text-muted-foreground");
	});
});
