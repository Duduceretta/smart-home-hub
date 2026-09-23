import { Check, ChevronDown, Plus } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu";
import { useCurrentUser } from "@/core/hooks/useCurrentUser";
import { type HomeProject, useHomeProjects } from "../hooks/useHomeProjects";

interface HomeHeaderProps {
	activeDevicesCount?: number;
	initialProjects?: HomeProject[];
}

function useGreeting() {
	const { t } = useTranslation("home");
	return useMemo(() => {
		const hour = new Date().getHours();
		if (hour < 12) return t("greeting.morning");
		if (hour < 18) return t("greeting.afternoon");
		return t("greeting.evening");
	}, [t]);
}

export function HomeHeader({
	activeDevicesCount = 0,
	initialProjects,
}: HomeHeaderProps) {
	const { t } = useTranslation("home");
	const { user } = useCurrentUser();
	const greeting = useGreeting();
	const { projects, currentProject, selectProject, hasMultipleProjects } =
		useHomeProjects(initialProjects);

	const firstName = user?.displayName?.split(" ")[0];
	const projectTitle = currentProject?.name ?? t("projectTitle");

	const handleAddProject = () => {
		// TODO(multi-project): Integração futura para criação de múltiplos projetos/casas.
		toast.info(t("header.addProject", "Adicionar residência (em breve)"), {
			description:
				"O suporte a múltiplos projetos será disponibilizado em atualizações futuras do hub.",
		});
	};

	return (
		<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div className="flex flex-col gap-1">
				<p className="text-sm font-normal text-muted-foreground">
					{greeting}
					{firstName ? `, ${firstName}` : ` ${t("greeting.fallbackName")}`}
				</p>

				{/*
				 * Renderização condicional do seletor de projeto:
				 * - Cenário 1 projeto (realidade atual): omite o dropdown completamente e renderiza h1 direto.
				 * - Cenário multi-projeto (preparado): renderiza DropdownMenu com switcher e feedback visual.
				 */}
				{hasMultipleProjects ? (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								type="button"
								className="group flex w-fit items-center gap-2 text-2xl font-semibold tracking-tight text-foreground transition-colors hover:text-primary cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-md"
								aria-label={t("header.switchProject", "Alternar residência")}
							>
								<span>{projectTitle}</span>
								<ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-hover:text-foreground group-data-[state=open]:rotate-180" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							align="start"
							className="w-56 text-foreground shadow-lg"
						>
							{projects.map((project) => (
								<DropdownMenuItem
									key={project.id}
									onClick={() => selectProject(project.id)}
									className="flex items-center justify-between cursor-pointer"
								>
									<span className="truncate">{project.name}</span>
									{project.id === currentProject.id && (
										<Check className="h-4 w-4 text-primary" />
									)}
								</DropdownMenuItem>
							))}
							<DropdownMenuSeparator className="bg-border-subtle" />
							<DropdownMenuItem
								onClick={handleAddProject}
								className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
							>
								<Plus className="h-4 w-4" />
								<span>{t("header.addProject", "Adicionar residência")}</span>
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				) : (
					<div className="flex items-center gap-2.5">
						<h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
							{projectTitle}
						</h1>
					</div>
				)}
			</div>

			{/* Status "At a Glance" sutil (Google Home / Apple Home style) */}
			<div className="flex items-center gap-2 self-start sm:self-auto">
				<div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-card px-3 py-1 text-xs font-medium text-foreground shadow-2xs">
					<span className="relative flex h-2 w-2">
						<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
						<span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
					</span>
					<span>{t("header.statusConnected", "Online")}</span>
					<span className="text-muted-foreground">•</span>
					<span className="text-muted-foreground">
						{activeDevicesCount > 0
							? t("header.activeCount", { count: activeDevicesCount })
							: t("header.allQuiet", "Tudo tranquilo")}
					</span>
				</div>
			</div>
		</header>
	);
}
