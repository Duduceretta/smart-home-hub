import { Clock, Radio } from "lucide-react";
import type { ComponentType } from "react";

/**
 * Ícone por tipo de gatilho — usado em AutomationCard, AutomationRow e
 * AutomationDetailPanel. Centralizado aqui (em vez de repetido em cada
 * componente) igual ao ROOM_ICON_MAP em rooms/constants.
 */
export const AUTOMATION_TRIGGER_ICON: Record<
	"schedule" | "sensor",
	ComponentType<{ className?: string }>
> = {
	schedule: Clock,
	sensor: Radio,
};
