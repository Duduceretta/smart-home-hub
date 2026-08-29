import { cn } from "@/core/utils";
import { TRIGGER_SOURCE_OPTIONS } from "../../../constants/automations.constants";
import type { TriggerSource } from "../../../types/automation-wizard.types";

interface TriggerSourceStepProps {
	selected: TriggerSource | null;
	onSelect: (source: TriggerSource) => void;
}

/**
 * Passo 1 — grade de 4 cards de seleção única. "Localização" fica
 * desabilitada (sem suporte no backend hoje, ver TRIGGER_SOURCE_OPTIONS) —
 * ainda aparece pra manter a estrutura de 4 opções pedida, só não é
 * clicável.
 */
export function TriggerSourceStep({
	selected,
	onSelect,
}: TriggerSourceStepProps) {
	return (
		<div className="flex flex-1 flex-col gap-4">
			<div>
				<h2 className="text-lg font-medium text-foreground">
					Qual a origem do gatilho?
				</h2>
				<p className="mt-0.5 text-sm text-muted-foreground">
					Escolha o que faz essa automação começar a agir.
				</p>
			</div>

			<div className="grid grid-cols-2 gap-4">
				{TRIGGER_SOURCE_OPTIONS.map((option) => {
					const Icon = option.icon;
					const isSelected = selected === option.value;

					return (
						<button
							key={option.value}
							type="button"
							disabled={option.comingSoon}
							aria-pressed={isSelected}
							onClick={() => onSelect(option.value)}
							className={cn(
								"flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors",
								option.comingSoon
									? "cursor-not-allowed border-border-subtle bg-surface-high/50 opacity-50"
									: "cursor-pointer border-border-subtle bg-surface-high hover:border-primary/25",
								isSelected &&
									!option.comingSoon &&
									"border-primary/40 bg-primary/5",
							)}
						>
							<div className="flex items-center justify-between">
								<span
									className={cn(
										"flex h-9 w-9 items-center justify-center rounded-full",
										isSelected
											? "bg-primary/15 text-primary"
											: "bg-muted text-muted-foreground",
									)}
								>
									<Icon className="h-4.5 w-4.5" />
								</span>
								{option.comingSoon && (
									<span className="rounded-full border border-border-subtle px-2 py-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
										Em breve
									</span>
								)}
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">
									{option.label}
								</p>
								<p className="mt-0.5 text-sm text-muted-foreground">
									{option.description}
								</p>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
