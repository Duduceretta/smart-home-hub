import {
	ArrowRight,
	Clapperboard,
	LogOut,
	Moon,
	Sparkles,
	Sun,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/core/utils";
import { CATEGORY_ICON_CLASS } from "../constants/home-categories";

export interface QuickSceneItem {
	id: string;
	name: string;
	iconName?: string;
	isActive?: boolean;
	onTrigger?: () => void;
}

interface HomeQuickActionsProps {
	scenes?: QuickSceneItem[];
}

const DEFAULT_SCENES: QuickSceneItem[] = [
	{ id: "cinema", name: "Modo Cinema", iconName: "Clapperboard" },
	{ id: "morning", name: "Bom Dia", iconName: "Sun" },
	{ id: "night", name: "Boa Noite", iconName: "Moon" },
	{ id: "away", name: "Sair de Casa", iconName: "LogOut" },
];

export function HomeQuickActions({ scenes }: HomeQuickActionsProps) {
	const { t } = useTranslation("home");
	const [activeSceneId, setActiveSceneId] = useState<string | null>(null);

	const effectiveScenes = scenes && scenes.length > 0 ? scenes : DEFAULT_SCENES;

	const handleTrigger = (scene: QuickSceneItem) => {
		setActiveSceneId(scene.id);
		if (scene.onTrigger) {
			scene.onTrigger();
		} else {
			toast.success(`Cena "${scene.name}" acionada com sucesso.`, {
				description: "Dispositivos e iluminação sincronizados.",
			});
		}
		setTimeout(() => {
			setActiveSceneId(null);
		}, 1200);
	};

	// Cenas → famílias categóricas (docs/theme-proposal.md §7)
	const renderIcon = (id: string) => {
		switch (id) {
			case "cinema":
				return (
					<Clapperboard className={cn("h-4 w-4", CATEGORY_ICON_CLASS.media)} />
				);
			case "morning":
				return <Sun className={cn("h-4 w-4", CATEGORY_ICON_CLASS.lighting)} />;
			case "night":
				return <Moon className={cn("h-4 w-4", CATEGORY_ICON_CLASS.climate)} />;
			case "away":
				return (
					<LogOut className={cn("h-4 w-4", CATEGORY_ICON_CLASS.security)} />
				);
			default:
				return <Sparkles className="h-4 w-4 text-muted-foreground" />;
		}
	};

	return (
		<section className="flex h-full flex-col justify-between gap-3 rounded-xl border border-border-subtle bg-card p-4 sm:p-5 shadow-2xs">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<Sparkles className="h-4 w-4 text-muted-foreground" />
					<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
						{t("scenes.title", "Cenas Rápidas")}
					</h2>
				</div>
				<Link
					to="/automations"
					className="group flex items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
				>
					<span>{t("scenes.actionExplore", "Ver automações")}</span>
					<ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
				</Link>
			</div>

			{/* Grid de botões táteis de cenas */}
			<div className="grid grid-cols-2 gap-2 sm:gap-2.5">
				{effectiveScenes.map((scene) => {
					const isRunning = activeSceneId === scene.id;
					return (
						<button
							key={scene.id}
							type="button"
							onClick={() => handleTrigger(scene)}
							className={cn(
								"group flex items-center gap-2.5 rounded-lg border p-2.5 sm:p-3 text-left transition-all cursor-pointer select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
								isRunning
									? "border-primary/40 bg-primary/15 scale-[0.98] shadow-sm"
									: "border-border-subtle bg-popover hover:border-border hover:bg-surface-highest shadow-2xs",
							)}
						>
							<div
								className={cn(
									"flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
									isRunning
										? "border-primary/40 bg-muted"
										: "border-border-subtle bg-muted group-hover:border-border",
								)}
							>
								{renderIcon(scene.id)}
							</div>
							<div className="flex min-w-0 flex-col">
								<span className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
									{scene.name}
								</span>
								<span className="truncate text-xs text-muted-foreground">
									{isRunning ? "Acionando..." : "1 toque"}
								</span>
							</div>
						</button>
					);
				})}
			</div>
		</section>
	);
}
