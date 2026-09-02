import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useMediaQuery } from "@/core/hooks/useMediaQuery";
import { cn } from "@/core/utils";
import { useAutomationFilterCounts } from "../hooks/useAutomationFilterCounts";
import { useAutomations } from "../hooks/useAutomations";
import { useCreateAutomation } from "../hooks/useCreateAutomation";
import { useDeleteAutomation } from "../hooks/useDeleteAutomation";
import { usePickerDevices } from "../hooks/usePickerDevices";
import { useUpdateAutomation } from "../hooks/useUpdateAutomation";
import { mapAutomationToView } from "../lib/automation-view.mapper";
import { useAutomationsUIStore } from "../store/automations-ui.store";
import type { AutomationView } from "../types/automations.types";
import { AutomationDetailPanel } from "./detail/AutomationDetailPanel";
import { AutomationCreationWizard } from "./dialogs/creation-wizard/AutomationCreationWizard";
import { AutomationEditModal } from "./dialogs/edit-modal/AutomationEditModal";
import { AutomationFilterChips } from "./list/AutomationFilterChips";
import { AutomationFilterRail } from "./list/AutomationFilterRail";
import { AutomationListPanel } from "./list/AutomationListPanel";
import { AutomationSummaryBar } from "./list/AutomationSummaryBar";

/**
 * View de Automações — master-detail (split-view) acima de `lg` (1024px):
 * lista à esquerda + painel de detalhe ocupando o restante à direita, os
 * dois nascem no mesmo Y.
 *
 * Abaixo de `lg`, vira navegação em pilha (stack) — só master OU detail
 * ocupam a tela, nunca os dois. A automação selecionada é refletida em
 * `?automation=<id>` na própria URL de `/automations` (não um estado paralelo):
 * tocar num item empurra uma entrada nova no histórico (o botão físico de
 * voltar do navegador desfaz exatamente essa seleção, voltando pra lista),
 * o botão "voltar" do painel de detalhe faz o mesmo removendo o param.
 * Acima de `lg`, onde master e detail já ficam lado a lado, selecionar uma
 * automação troca a URL via `replace` (não empilha histórico por clique —
 * mesmo comportamento silencioso de mouse).
 *
 * Filtro/busca/ordenação/paginação são TODOS resolvidos server-side
 * (`useAutomations` → `useInfiniteQuery`, mesmo padrão de `DevicesGrid`) —
 * `filter`/`query`/`sort` da `useAutomationsUIStore` só viram parâmetros da
 * query, nunca `.filter()`/`.sort()` local. As contagens da trilha/resumo
 * vêm de `useAutomationFilterCounts`, uma query própria.
 */
export function AutomationsView() {
	const { t } = useTranslation("automations");
	const location = useLocation();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const isDesktopMasterDetail = useMediaQuery("(min-width: 1024px)");

	const returnTo = (location.state as { returnTo?: string })?.returnTo;
	const returnLabel = (location.state as { returnLabel?: string })?.returnLabel;
	const stateAutomationId = (
		location.state as { selectedAutomationId?: string }
	)?.selectedAutomationId;

	const {
		query,
		setQuery,
		filter,
		setFilter,
		sort,
		setSort,
		viewMode,
		setViewMode,
		openCreateWizard,
		openEditModal,
	} = useAutomationsUIStore();

	const selectedAutomationId = searchParams.get("automation");

	/** Seleção via toque/clique numa linha da lista — histórico só cresce
	 * abaixo de `lg` (pilha mobile); em telas largas troca a URL sem
	 * empilhar, preservando o comportamento de mouse já existente. */
	const selectAutomation = useCallback(
		(id: string) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set("automation", id);
					return next;
				},
				{ replace: isDesktopMasterDetail },
			);
		},
		[setSearchParams, isDesktopMasterDetail],
	);

	/** Seleção programática (default inicial / correção de filtro) — nunca
	 * empilha histórico, só acontece em telas largas (`autoSelectFirst`). */
	const setDefaultAutomation = useCallback(
		(id: string | null) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (id) next.set("automation", id);
					else next.delete("automation");
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	/** Botão "voltar" do painel de detalhe (só existe <lg) — sempre empilha,
	 * pra o botão físico de voltar do navegador desfazer exatamente essa ação
	 * (volta pro detalhe), e não sair da tela de Automações. */
	const clearSelection = useCallback(() => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("automation");
			return next;
		});
	}, [setSearchParams]);

	const debouncedQuery = useDebouncedValue(query, 300);

	// `filter` (UI, um valor só por vez) vira os parâmetros de
	// `GetAutomationsQuery` — nunca os 3 preenchidos juntos.
	const listFilters = useMemo(
		() => ({
			search: debouncedQuery,
			status:
				filter === "active"
					? ("active" as const)
					: filter === "inactive"
						? ("inactive" as const)
						: undefined,
			triggerKind:
				filter === "schedule" || filter === "sensor" ? filter : undefined,
			isDraft: filter === "draft" ? true : undefined,
			sort,
		}),
		[debouncedQuery, filter, sort],
	);

	const {
		data: automations,
		isLoading: isLoadingAutomations,
		isError: isAutomationsError,
		refetch: refetchAutomations,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
	} = useAutomations(listFilters);
	const { data: devices = [] } = usePickerDevices();
	const { data: filterCounts } = useAutomationFilterCounts();

	const updateAutomation = useUpdateAutomation();
	const deleteAutomation = useDeleteAutomation();
	const createAutomation = useCreateAutomation();

	const automationViews = useMemo(
		() => (automations ?? []).map((a) => mapAutomationToView(a, devices)),
		[automations, devices],
	);

	// Chegada via `location.state` (ex: Dashboard "ver automação")
	// biome-ignore lint/correctness/useExhaustiveDependencies: dispara só na chegada com stateAutomationId
	useEffect(() => {
		if (stateAutomationId) {
			setDefaultAutomation(stateAutomationId);
		}
	}, [stateAutomationId]);

	// Auto-seleção do primeiro item só acontece em telas desktop master-detail (lg+)
	useEffect(() => {
		if (
			isDesktopMasterDetail &&
			!selectedAutomationId &&
			automationViews.length > 0
		) {
			setDefaultAutomation(automationViews[0].id);
		}
	}, [
		isDesktopMasterDetail,
		selectedAutomationId,
		automationViews,
		setDefaultAutomation,
	]);

	// Se a automação selecionada não existir mais no conjunto filtrado/excluído (em desktop)
	useEffect(() => {
		if (
			isDesktopMasterDetail &&
			selectedAutomationId &&
			automationViews.length > 0 &&
			!automationViews.some((a) => a.id === selectedAutomationId)
		) {
			setDefaultAutomation(automationViews[0].id);
		}
	}, [
		isDesktopMasterDetail,
		selectedAutomationId,
		automationViews,
		setDefaultAutomation,
	]);

	const selectedAutomation =
		automationViews.find((a) => a.id === selectedAutomationId) ?? null;

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
		if (selectedAutomationId === id) {
			if (isDesktopMasterDetail) {
				const remaining = automationViews.filter((a) => a.id !== id);
				setDefaultAutomation(remaining.length > 0 ? remaining[0].id : null);
			} else {
				clearSelection();
			}
		}
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
				onSuccess: (data) => selectAutomation(data.automationId),
			},
		);
	};

	return (
		<div className="flex h-full min-h-0 gap-4">
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col gap-4 lg:flex lg:w-96 lg:shrink-0",
					selectedAutomationId ? "hidden lg:flex" : "flex",
				)}
			>
				<div className="flex shrink-0 flex-col gap-1">
					{returnTo && (
						<button
							type="button"
							onClick={() => navigate(returnTo)}
							className="inline-flex items-center gap-1.5 self-start text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-1"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							{t("header.returnTo", {
								label: returnLabel || t("title", "Automações"),
							})}
						</button>
					)}
					<h1 className="text-3xl font-bold tracking-tight text-foreground">
						{t("title", "Automações")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t(
							"header.subtitle",
							"Crie regras com gatilhos, condições e ações pra automatizar sua casa.",
						)}
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
						<AutomationSummaryBar counts={filterCounts} />

						{/* Mobile (<lg): Fileira horizontal de pills roláveis com fade dinâmico */}
						<div className="block lg:hidden w-full">
							<AutomationFilterChips
								counts={filterCounts}
								filter={filter}
								onFilterChange={setFilter}
							/>
						</div>

						<div className="flex min-h-0 flex-1 items-start gap-3">
							{/* Desktop (lg+): Trilha vertical expansível */}
							<div className="hidden lg:block h-full shrink-0">
								<AutomationFilterRail
									counts={filterCounts}
									filter={filter}
									onFilterChange={setFilter}
									sort={sort}
									onSortChange={setSort}
								/>
							</div>

							<div className="h-full min-w-0 flex-1 w-full">
								<AutomationListPanel
									automations={automationViews}
									selectedId={selectedAutomationId}
									onSelect={selectAutomation}
									viewMode={viewMode}
									onViewModeChange={setViewMode}
									onToggle={handleToggle}
									onCreate={openCreateWizard}
									query={query}
									onQueryChange={setQuery}
									onLoadMore={fetchNextPage}
									hasMore={hasNextPage}
									isLoadingMore={isFetchingNextPage}
									resetKey={`${filter}|${sort}|${debouncedQuery}`}
								/>
							</div>
						</div>
					</>
				)}
			</div>

			<div
				className={cn(
					"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
					selectedAutomationId ? "flex" : "hidden lg:flex",
				)}
			>
				<AutomationDetailPanel
					automation={selectedAutomation}
					onBack={clearSelection}
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
