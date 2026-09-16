import { useMemo } from "react";
import { ACTIVITY_LOG_VISIBLE_ENTRIES_LIMIT } from "@/features/dashboard/constants/dashboard.constants";
import { useActivityLog } from "@/features/dashboard/hooks/useActivityLog";
import { useDashboardOverview } from "@/features/dashboard/hooks/useDashboardOverview";
import { useDevices } from "@/features/devices/hooks/useDevices";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { HomeActivityFeed } from "./components/HomeActivityFeed";
import { HomeAlertBanner } from "./components/HomeAlertBanner";
import { HomeCameraTile } from "./components/HomeCameraTile";
import { HomeClockHeroTile } from "./components/HomeClockHeroTile";
import { HomeDeviceGrid } from "./components/HomeDeviceGrid";
import { HomeEnergyTile } from "./components/HomeEnergyTile";
import { HomeHeader } from "./components/HomeHeader";
import { HomeMediaTile } from "./components/HomeMediaTile";
import { HomeQuickActions } from "./components/HomeQuickActions";
import { HomeSecurityTile } from "./components/HomeSecurityTile";

const DEVICES_PAGE_SIZE = 200;

/**
 * Página Inicial do Smart Home Hub — Bento Grid Completo & Mobile-First.
 *
 * Arquitetura Bento 12 Colunas (Desktop):
 * - Linha 1: [Relógio Digital + Clima + Próxima Rotina - 8 cols] + [Perímetro & Alarme - 4 cols]
 * - Linha 2: [Hub de Dispositivos com Switches Táteis - 8 cols] + [Cenas Rápidas 1-Toque - 4 cols]
 * - Linha 3: [Mídia & Som Tocando Agora - 4 cols] + [Telemetria de Energia Watts - 4 cols] + [Câmera Entrada Ao Vivo - 4 cols]
 * - Linha 4: [Feed de Atividade do Hub - 12 cols]
 *
 * Mobile-First:
 * - Adapta-se fluidamente em fluxo vertical com grade tátil de 2 colunas nos dispositivos.
 */
export function HomeView() {
	// Aquece o cache de cômodos em background para sincronia do hub
	useRooms();

	const {
		data: devicesPage,
		isLoading: isDevicesLoading,
		isError: isDevicesError,
		refetch: refetchDevices,
	} = useDevices({ pageSize: DEVICES_PAGE_SIZE });

	const { data: overviewData } = useDashboardOverview();

	const { data: activityLogData, isLoading: isActivityLoading } =
		useActivityLog(1, ACTIVITY_LOG_VISIBLE_ENTRIES_LIMIT);

	const devices = devicesPage?.items ?? [];
	const activeAlertsCount = overviewData?.summary.activeAlertsCount ?? 0;

	// Total de atuadores ligados no momento
	const activeDevicesCount = useMemo(
		() => devices.filter((d) => d.isOnline && d.isOn).length,
		[devices],
	);

	return (
		<div className="flex flex-col gap-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300">
			{/* 1. Header (Saudação contextual, Seletor condicional de projeto, Status at-a-glance) */}
			<HomeHeader activeDevicesCount={activeDevicesCount} />

			{/* 2. Alerta Crítico em Destaque (se houver, no topo com largura total) */}
			<HomeAlertBanner activeAlertsCount={activeAlertsCount} />

			{/* 3. Bento Grid Principal (12 colunas no desktop, fluxo natural no mobile).
			 * Sem items-start: o stretch padrão do CSS Grid já iguala a altura dos
			 * tiles dentro da mesma linha, sem precisar de self-stretch manual em
			 * cada wrapper (fácil de esquecer ao adicionar um tile novo — foi
			 * exatamente isso que desalinhou Clock/Device Grid contra os vizinhos). */}
			<div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
				{/* Bento Tile 1: Relógio Digital, Clima e Próxima Rotina (8 colunas) */}
				<div className="lg:col-span-8">
					<HomeClockHeroTile summary={overviewData?.summary} />
				</div>

				{/* Bento Tile 2: Perímetro de Segurança & Alarme (4 colunas) */}
				<div className="lg:col-span-4">
					<HomeSecurityTile />
				</div>

				{/* Bento Tile 3: Hub de Dispositivos (8 colunas) */}
				<div className="lg:col-span-8">
					<HomeDeviceGrid
						devices={devices}
						isLoading={isDevicesLoading}
						isError={isDevicesError}
						onRetry={() => refetchDevices()}
					/>
				</div>

				{/* Bento Tile 4: Cenas & Ações Rápidas de 1 Toque (4 colunas) */}
				<div className="lg:col-span-4">
					<HomeQuickActions />
				</div>

				{/* Bento Tile 5: Áudio & Mídia em Tempo Real (4 colunas) */}
				<div className="lg:col-span-4">
					<HomeMediaTile />
				</div>

				{/* Bento Tile 6: Telemetria de Energia & Carga (4 colunas) */}
				<div className="lg:col-span-4">
					<HomeEnergyTile summary={overviewData?.summary} />
				</div>

				{/* Bento Tile 7: Câmera de Vigilância Ao Vivo (4 colunas) */}
				<div className="lg:col-span-4">
					<HomeCameraTile />
				</div>

				{/* Bento Tile 8: Atividade Recente (12 colunas / largura total) */}
				<div className="lg:col-span-12">
					{!isActivityLoading && (
						<HomeActivityFeed entries={activityLogData?.items ?? []} />
					)}
				</div>
			</div>
		</div>
	);
}
