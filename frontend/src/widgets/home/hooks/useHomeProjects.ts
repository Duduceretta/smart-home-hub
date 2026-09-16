import { useMemo, useState } from "react";

export interface HomeProject {
	id: string;
	name: string;
	isPrimary: boolean;
	role?: string;
}

/**
 * Hook para gerenciamento de projetos/casas na tela inicial.
 *
 * TODO(multi-project): O backend atualmente assume contexto único de residência
 * (entidade Device e Room vinculados diretamente ao UserId sem tabela de Projeto/Casa intermediária).
 * Quando a API implementar endpoints reais de múltiplos hubs/casas (`GET /api/projects`),
 * este hook deve plugar TanStack Query (`useQuery({ queryKey: ['projects'], queryFn: ... })`).
 * A interface de usuário já é 100% dinâmica: se `projects.length === 1`, omite o dropdown
 * e exibe o título diretamente; se `projects.length > 1`, exibe o seletor com troca de contexto.
 */
export function useHomeProjects(initialProjects?: HomeProject[]) {
	// Estado com fallback gracioso para a realidade atual de projeto único.
	const [projects, setProjects] = useState<HomeProject[]>(
		() =>
			initialProjects ?? [
				{
					id: "default",
					name: "Nexus Hub",
					isPrimary: true,
					role: "primary",
				},
			],
	);

	const [activeProjectId, setActiveProjectId] = useState<string>(
		() => projects[0]?.id ?? "default",
	);

	const currentProject = useMemo(() => {
		return projects.find((p) => p.id === activeProjectId) ?? projects[0];
	}, [projects, activeProjectId]);

	return {
		projects,
		setProjects,
		currentProject,
		selectProject: setActiveProjectId,
		hasMultipleProjects: projects.length > 1,
	};
}
