import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useMemo } from "react";
import { cn } from "@/core/utils";
import { useAutomations } from "../hooks/useAutomations";
import { useCreateAutomation } from "../hooks/useCreateAutomation";
import { useDeleteAutomation } from "../hooks/useDeleteAutomation";
import { usePickerDevices } from "../hooks/usePickerDevices";
import { useUpdateAutomation } from "../hooks/useUpdateAutomation";
import { mapAutomationToView } from "../lib/automation-view.mapper";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import type { AutomationView } from "../types/automations.types";
import { AutomationDetailPanel } from "./AutomationDetailPanel";
import { AutomationFilterRail } from "./AutomationFilterRail";
import { AutomationListPanel } from "./AutomationListPanel";
import { AutomationSummaryBar } from "./AutomationSummaryBar";
import { AutomationCreationWizard } from "./creation-wizard/AutomationCreationWizard";
import { AutomationEditModal } from "./edit-modal/AutomationEditModal";

/**
 * View de Automações — master-detail (split-view) fixo, inspirado em
 * Linear/Gmail: lista à esquerda, painel de detalhe sempre preenchido à
 * direita. Abaixo de `lg` cai pra navegação empilhada (lista OU detalhe
 * cheio, controlado por `selectedId` + classes responsivas — sem rota
 * nova).
 *
 * Diferente das demais páginas (que rolam a página inteira), aqui a lista
 * e o painel de detalhe têm CADA UM seu próprio scroll interno, contido
 * numa altura fixa (`h-full` — chega até o fim da tela disponível via
 * `AppLayout`). Isso foi escolhido de propósito no lugar de deixar a
 * página inteira rolar: com scroll infinito na lista, uma página que rola
 * por inteiro obrigaria o usuário a rolar de volta uma distância enorme
 * pra voltar ao topo depois de carregar muitos lotes — com scroll contido,
 * voltar ao topo da lista é sempre instantâneo, independente de quantas
 * automações já foram carregadas.
 *
 * Query/filtro/ordenação/viewMode/seleção são estado efêmero de UI — vivem
 * na `useAutomationsUIStore` (Zustand), igual ao `query` de `RoomsView`,
 * não em `useState` local. Filtro/busca/ordenação são só client-side por
 * enquanto (o backend não expõe esses parâmetros na listagem ainda — vira
 * paginação/filtro server-side depois).
 *
 * Dados reais via `useAutomations` — `rulePayload` (JSON opaco) é resumido
 * em texto pela `AutomationView` (ver `automation-view.mapper.ts`), usando
 * `usePickerDevices` pra trocar IDs de dispositivo por nomes. Criar usa o
 * `AutomationCreationWizard` (wizard de 4 passos); editar usa o
 * `AutomationEditModal` (formulário único, sem stepper) — os dois
 * compartilham a mesma lógica de gatilho/ações via `automation-form-reducer.ts`.
 * `handleEdit` busca a `Automation` crua (com `rulePayload`) no array
 * original, já que o modal de edição precisa do payload completo, não do
 * resumo em texto da `AutomationView`.
 */
export function AutomationsView() {
	const {
		data: automations,
		isLoading: isLoadingAutomations,
		isError: isAutomationsError,
		refetch: refetchAutomations,
	} = useAutomations();
	const { data: devices = [] } = usePickerDevices();

	const updateAutomation = useUpdateAutomation();
	const deleteAutomation = useDeleteAutomation();
	const createAutomation = useCreateAutomation();

	const {
		query,
		setQuery,
		filter,
		setFilter,
		sort,
		setSort,
		viewMode,
		setViewMode,
		selectedId,
		setSelectedId,
		openCreateWizard,
		openEditModal,
	} = useAutomationsUIStore();

	const automationViews = useMemo(
		() => (automations ?? []).map((a) => mapAutomationToView(a, devices)),
		[automations, devices],
	);

	const visibleAutomations = useMemo(() => {
		let result = automationViews;

		if (filter === "active") result = result.filter((a) => a.isActive);
		else if (filter === "inactive") result = result.filter((a) => !a.isActive);
		else if (filter === "draft") result = result.filter((a) => a.isDraft);
		else if (filter === "schedule" || filter === "sensor")
			result = result.filter((a) => a.triggerKind === filter);

		if (query.trim()) {
			const search = query.trim().toLowerCase();
			result = result.filter((a) => a.name.toLowerCase().includes(search));
		}

		return [...result].sort((a, b) => {
			if (sort === "status") return Number(b.isActive) - Number(a.isActive);
			return a.name.localeCompare(b.name);
		});
	}, [automationViews, filter, query, sort]);

	// Seleção padrão: o PRIMEIRO item da lista ordenada/filtrada visível, não
	// o primeiro do array bruto — sort default é por nome. Também recupera a
	// seleção automaticamente depois de excluir/filtrar o item selecionado.
	useEffect(() => {
		if (selectedId === null && visibleAutomations.length > 0) {
			setSelectedId(visibleAutomations[0].id);
		}
	}, [selectedId, visibleAutomations, setSelectedId]);

	const selectedAutomation =
		automationViews.find((a) => a.id === selectedId) ?? null;

	const handleToggle = (id: string, nextValue: boolean) => {
		const automation = automationViews.find((a) => a.id === id);
		if (!automation) return;
		updateAutomation.mutate({
			id,
			payload: {
				name: automation.name,
				rulePayload: automation.rulePayload,
				isActive: nextValue,
			},
		});
	};

	const handleDelete = (id: string) => {
		if (selectedId === id) setSelectedId(null);
		deleteAutomation.mutate(id);
	};

	const handleEdit = (automationView: AutomationView) => {
		const automation = (automations ?? []).find(
			(a) => a.id === automationView.id,
		);
		if (automation) openEditModal(automation);
	};

	const handleDuplicate = (automation: AutomationView) => {
		createAutomation.mutate(
			{
				name: `${automation.name} (cópia)`,
				rulePayload: automation.rulePayload,
				isActive: false,
			},
			{
				onSuccess: (data) => setSelectedId(data.automationId),
			},
		);
	};

	// Estrutura macro igual à de `RoomsView`: coluna master (título + trilha +
	// lista) à esquerda, painel de detalhe como coluna irmã à direita — as
	// duas nascem no mesmo Y (nivela com o título). Dentro da coluna master,
	// título/subtítulo/stats ficam no topo ocupando a largura toda; a trilha
	// de filtro nasce só ABAIXO do header, lado a lado com a lista
	// (`items-start` — mesma linha Y do cabeçalho "X automações" da lista,
	// não do título da página), e as duas esticam (`h-full`) até o fim da
	// coluna.
	return (
		<div className="flex h-full min-h-0 gap-4">
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col gap-4 lg:flex lg:w-96 lg:shrink-0",
					selectedId ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="flex shrink-0 flex-col gap-1">
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						Automações
					</h1>
					<p className="text-sm text-muted-foreground">
						Crie regras com gatilhos, condições e ações pra automatizar sua
						casa.
					</p>
				</div>

				{isAutomationsError ? (
					<div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
						<AlertTriangle className="h-6 w-6 text-destructive" />
						<p className="text-sm font-medium text-destructive">
							Não foi possível carregar as automações.
						</p>
						<button
							type="button"
							onClick={() => refetchAutomations()}
							className="mt-2 rounded-md border border-border-subtle bg-surface-container px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-foreground transition-all hover:border-border hover:bg-surface-high cursor-pointer shadow-xs"
						>
							Tentar novamente
						</button>
					</div>
				) : isLoadingAutomations ? (
					<div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin text-primary" />
						Carregando automações...
					</div>
				) : (
					<>
						<AutomationSummaryBar automations={automationViews} />

						<div className="flex min-h-0 flex-1 items-start gap-3">
							<AutomationFilterRail
								automations={automationViews}
								filter={filter}
								onFilterChange={setFilter}
								sort={sort}
								onSortChange={setSort}
							/>

							<div className="h-full min-w-0 flex-1">
								<AutomationListPanel
									automations={visibleAutomations}
									selectedId={selectedId}
									onSelect={setSelectedId}
									viewMode={viewMode}
									onViewModeChange={setViewMode}
									onToggle={handleToggle}
									onCreate={openCreateWizard}
									query={query}
									onQueryChange={setQuery}
									resetKey={`${filter}|${sort}|${query.trim().toLowerCase()}`}
								/>
							</div>
						</div>
					</>
				)}
			</div>

			<div
				className={cn(
					"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
					selectedId ? "flex" : "hidden lg:flex",
				)}
			>
				<AutomationDetailPanel
					automation={selectedAutomation}
					onBack={() => setSelectedId(null)}
					onToggle={handleToggle}
					onEdit={handleEdit}
					onDuplicate={handleDuplicate}
					onDelete={handleDelete}
				/>
			</div>

			<AutomationCreationWizard />
			<AutomationEditModal />
		</div>
	);
}
