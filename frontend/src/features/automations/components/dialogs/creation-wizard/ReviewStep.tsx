import { Loader2, Pencil, Zap } from "lucide-react";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";
import { Switch } from "@/core/components/ui/switch";
import {
	SENSOR_METRIC_LABELS,
	WEEKDAY_OPTIONS,
} from "../../../constants/automations.constants";
import type { UseAutomationWizardReturn } from "../../../hooks/useAutomationWizard";
import { isNameValid } from "../../../lib/automation-form-reducer";
import type { AutomationWizardState } from "../../../types/automation-wizard.types";
import type { PickerDevice } from "../../../types/automations.types";

const COMPARISON_LABELS: Record<string, string> = {
	">": "maior que",
	">=": "maior ou igual a",
	"<": "menor que",
	"<=": "menor ou igual a",
	"==": "igual a",
	"!=": "diferente de",
};

function findDeviceName(id: string, devices: PickerDevice[]): string {
	return devices.find((d) => d.id === id)?.name ?? "dispositivo removido";
}

function describeTrigger(
	state: AutomationWizardState,
	devices: PickerDevice[],
): string {
	const deviceName = (id: string) => findDeviceName(id, devices);

	if (state.triggerSource === "sensor") {
		const { deviceId, metric, comparison, value } = state.sensorConfig;
		return `Quando ${deviceName(deviceId)} tiver ${SENSOR_METRIC_LABELS[metric].toLowerCase()} ${COMPARISON_LABELS[comparison]} ${value}`;
	}

	if (state.triggerSource === "device") {
		const { deviceId, desiredIsOn } = state.deviceConfig;
		return `Quando ${deviceName(deviceId)} mudar para ${desiredIsOn ? "Ligado" : "Desligado"}`;
	}

	if (state.triggerSource === "schedule") {
		const { time, weekdays } = state.scheduleConfig;
		const daysLabel =
			weekdays.length === 7
				? "Todos os dias"
				: weekdays.map((d) => WEEKDAY_OPTIONS[d].label).join(", ");
		return `${daysLabel} às ${time}`;
	}

	return "Gatilho não configurado";
}

interface ReviewStepProps {
	wizard: UseAutomationWizardReturn;
	devices: PickerDevice[];
	onSubmit: () => void;
	isSubmitting: boolean;
	submitError?: string;
}

/**
 * Passo 4 — nome, recapitulação do gatilho/ações (com "Editar" voltando
 * pro passo correspondente sem limpar nada, já que tudo mora no reducer
 * do wizard) e o toggle final antes de salvar.
 */
export function ReviewStep({
	wizard,
	devices,
	onSubmit,
	isSubmitting,
	submitError,
}: ReviewStepProps) {
	const { state, setName, setActivateImmediately, goToStep } = wizard;

	const deviceName = (id: string) => findDeviceName(id, devices);

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium text-foreground">Tudo pronto?</h2>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Revise as configurações e dê um nome pra automação.
				</p>
			</div>

			<FormGlobalError error={submitError} />

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="automation-name">Nome da automação</Label>
				<Input
					id="automation-name"
					autoFocus
					value={state.name}
					onChange={(event) => setName(event.target.value)}
					placeholder="Ex: Desligar tudo à noite"
					maxLength={150}
					className="h-11 sm:h-9"
				/>
			</div>

			<div className="rounded-lg border border-border-subtle/10 bg-surface-high p-4">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Gatilho
					</span>
					<button
						type="button"
						onClick={() => goToStep(2)}
						className="inline-flex h-11 sm:h-auto items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
					>
						<Pencil className="h-3 w-3" />
						Editar
					</button>
				</div>
				<p className="text-sm text-foreground">
					{describeTrigger(state, devices)}
				</p>
			</div>

			<div className="rounded-lg border border-border-subtle/10 bg-surface-high p-4">
				<div className="mb-2 flex items-center justify-between">
					<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						Ações
					</span>
					<button
						type="button"
						onClick={() => goToStep(3)}
						className="inline-flex h-11 sm:h-auto items-center gap-1 text-sm text-primary hover:underline cursor-pointer"
					>
						<Pencil className="h-3 w-3" />
						Editar
					</button>
				</div>
				<ul className="space-y-1">
					{state.actions.map((action) => (
						<li
							key={action.id}
							className="flex items-center gap-1 text-sm text-foreground"
						>
							<Zap className="h-3 w-3 shrink-0 text-muted-foreground" />
							{action.desiredState ? "Ligar" : "Desligar"}{" "}
							{deviceName(action.deviceId)}
						</li>
					))}
				</ul>
			</div>

			<div className="flex items-center justify-between rounded-lg border border-border-subtle/10 bg-surface-high p-4">
				<div>
					<p className="text-sm font-medium text-foreground">
						Ativar imediatamente
					</p>
					<p className="text-sm text-muted-foreground">
						Se desligado, a automação fica salva mas pausada.
					</p>
				</div>
				<div className="flex h-11 items-center shrink-0">
					<Switch
						checked={state.activateImmediately}
						onCheckedChange={setActivateImmediately}
						aria-label="Ativar automação imediatamente"
					/>
				</div>
			</div>

			<div className="mt-auto flex items-center justify-between gap-3 border-t border-border-subtle/10 pt-4">
				<Button
					type="button"
					variant="outline"
					className="h-11 sm:h-9"
					onClick={() => goToStep(3)}
					disabled={isSubmitting}
				>
					Voltar
				</Button>
				<Button
					type="button"
					className="h-11 sm:h-9"
					onClick={onSubmit}
					disabled={isSubmitting || !isNameValid(state)}
				>
					{isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
					Salvar Automação
				</Button>
			</div>
		</div>
	);
}
