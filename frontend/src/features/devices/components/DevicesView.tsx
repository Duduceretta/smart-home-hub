import { ArrowLeft } from "lucide-react";
import { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMediaQuery } from "@/core/hooks/useMediaQuery";
import { cn } from "@/core/utils";
import { useDevice } from "../hooks/useDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import { DeviceDetailPanel } from "./detail/DeviceDetailPanel";
import { DeviceDiscoveryModal } from "./dialogs/DeviceDiscoveryModal";
import { EditDeviceModal } from "./dialogs/EditDeviceModal";
import { DeviceFilterRail } from "./list/DeviceFilterRail";
import { DeviceListPanel } from "./list/DeviceListPanel";

/**
 * View de Dispositivos — master-detail acima de `lg` (1024px, mesmo
 * breakpoint que já fazia master/detail colapsar pra uma coluna): título
 * vive DENTRO da coluna master, painel de lista de largura fixa à esquerda +
 * painel de detalhe ocupando o restante à direita, os dois nascem no mesmo Y.
 *
 * Abaixo de `lg`, vira navegação em pilha (stack) — só master OU detail
 * ocupam a tela, nunca os dois. O dispositivo selecionado é refletido em
 * `?device=<id>` na própria URL de `/devices` (não um estado paralelo): tocar
 * num item empurra uma entrada nova no histórico (o botão físico de voltar
 * do navegador desfaz exatamente essa seleção, voltando pra lista), o botão
 * "voltar" do painel de detalhe faz o mesmo removendo o param. Acima de
 * `lg`, onde master e detail já ficam lado a lado, selecionar um dispositivo
 * troca a URL via `replace` (não empilha histórico por clique — mesmo
 * comportamento silencioso de antes, quando a seleção só vivia no Zustand).
 */
export const DevicesView: React.FC = () => {
	const { t } = useTranslation("devices");
	const location = useLocation();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();

	const isDesktopMasterDetail = useMediaQuery("(min-width: 1024px)");

	const returnTo = (location.state as { returnTo?: string })?.returnTo;
	const returnLabel = (location.state as { returnLabel?: string })?.returnLabel;
	const stateDeviceId = (location.state as { selectedDeviceId?: string })
		?.selectedDeviceId;

	const resetFilters = useDevicesUIStore((s) => s.resetFilters);
	const openDiscoveryModal = useDevicesUIStore((s) => s.openDiscoveryModal);

	const selectedDeviceId = searchParams.get("device");

	/** Seleção via toque/clique numa linha da lista — histórico só cresce
	 * abaixo de `lg` (pilha mobile); em telas largas troca a URL sem
	 * empilhar, preservando o comportamento de mouse já existente. */
	const selectDevice = useCallback(
		(id: string) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					next.set("device", id);
					return next;
				},
				{ replace: isDesktopMasterDetail },
			);
		},
		[setSearchParams, isDesktopMasterDetail],
	);

	/** Seleção programática (default inicial / correção de filtro) — nunca
	 * empilha histórico, só acontece em telas largas (`autoSelectFirst`). */
	const setDefaultDevice = useCallback(
		(id: string | null) => {
			setSearchParams(
				(prev) => {
					const next = new URLSearchParams(prev);
					if (id) next.set("device", id);
					else next.delete("device");
					return next;
				},
				{ replace: true },
			);
		},
		[setSearchParams],
	);

	/** Botão "voltar" do painel de detalhe (só existe <lg) — sempre empilha,
	 * pra o botão físico de voltar do navegador desfazer exatamente essa ação
	 * (volta pro detalhe), e não sair da tela de Dispositivos. */
	const clearSelection = useCallback(() => {
		setSearchParams((prev) => {
			const next = new URLSearchParams(prev);
			next.delete("device");
			return next;
		});
	}, [setSearchParams]);

	// Chegada via `location.state` (ex: Dashboard/Grupos "ver detalhes") —
	// estabelece o estado inicial sem criar uma entrada extra de histórico.
	// biome-ignore lint/correctness/useExhaustiveDependencies: dispara só na chegada com stateDeviceId, de propósito.
	useEffect(() => {
		if (stateDeviceId) {
			resetFilters();
			setDefaultDevice(stateDeviceId);
		}
	}, [stateDeviceId]);

	const { data: selectedDevice = null } = useDevice(selectedDeviceId ?? "");

	return (
		<div className="flex h-full min-h-0 gap-4">
			<div
				className={cn(
					"h-full w-full min-h-0 flex-col gap-4 lg:flex lg:w-96 lg:shrink-0",
					selectedDeviceId ? "hidden lg:flex" : "flex",
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
								label: returnLabel || t("title", "Dispositivos"),
							})}
						</button>
					)}
					<h1 className="text-3xl font-semibold tracking-tight text-foreground">
						{t("title")}
					</h1>
					<p className="text-sm text-muted-foreground">
						{t(
							"header.subtitle",
							"Gerencie conexões, consumo e estados dos periféricos integrados.",
						)}
					</p>
				</div>

				<div className="flex min-h-0 flex-1 items-start gap-3">
					<DeviceFilterRail />

					<div className="h-full min-w-0 flex-1">
						<DeviceListPanel
							selectedId={selectedDeviceId}
							onSelect={selectDevice}
							onAutoSelect={setDefaultDevice}
							autoSelectFirst={isDesktopMasterDetail}
							onCreate={openDiscoveryModal}
						/>
					</div>
				</div>
			</div>

			<div
				className={cn(
					"h-full w-full min-h-0 flex-col lg:flex lg:flex-1",
					selectedDeviceId ? "flex" : "hidden lg:flex",
				)}
			>
				<DeviceDetailPanel device={selectedDevice} onBack={clearSelection} />
			</div>

			<DeviceDiscoveryModal />
			<EditDeviceModal />
		</div>
	);
};
