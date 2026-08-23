import { ChevronDown, ChevronRight, Pencil } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
	Collapsible,
	CollapsibleContent,
} from "@/core/components/ui/collapsible";
import { DeviceCard } from "@/features/devices/components/DeviceCard";
import { useDevicesUIStore } from "@/features/devices/store/devices-ui.store";
import type { Device } from "@/features/devices/types/devices.types";
import { ROOM_ICON_MAP } from "@/features/rooms/constants/rooms.constants";
import { useDashboardPreviewStore } from "../store/dashboard-preview.store";
import { isWideDevice } from "../utils/deviceRowUnits";
import { EditRoomPreviewModal } from "./EditRoomPreviewModal";

/**
 * Seleciona só o que cabe em UMA linha da grade de 2 colunas, sem preferência
 * por tipo de dispositivo — sempre tenta preencher a linha inteira:
 * 1 card largo (TV/Climatização) sozinho, ou 2 cards normais lado a lado.
 */
function selectRowPreview(devices: Device[]): Device[] {
	if (devices.length === 0) return [];

	const [first, ...rest] = devices;
	if (isWideDevice(first.type)) return [first];

	const second = rest.find((device) => !isWideDevice(device.type));
	return second ? [first, second] : [first];
}

interface RoomDeviceSectionProps {
	title: string;
	devices: Device[];
	/** undefined para o bucket "Sem Ambiente" — não dá pra filtrar por isso na tela de Dispositivos. */
	roomId?: string;
	/** Ícone real cadastrado na sala (Room.icon) — mesmo id usado em ROOM_ICON_MAP. */
	icon?: string | null;
}

export function RoomDeviceSection({
	title,
	devices,
	roomId,
	icon,
}: RoomDeviceSectionProps) {
	const { t } = useTranslation("dashboard");
	const RoomIcon = ROOM_ICON_MAP[icon || ""] || ROOM_ICON_MAP.default;
	const navigate = useNavigate();
	const setSelectedRoomId = useDevicesUIStore((s) => s.setSelectedRoomId);
	const [isEditOpen, setIsEditOpen] = useState(false);

	const roomKey = roomId ?? "unassigned";
	const override = useDashboardPreviewStore((s) => s.overridesByRoom[roomKey]);
	const setRoomPreview = useDashboardPreviewStore((s) => s.setRoomPreview);
	const clearRoomPreview = useDashboardPreviewStore((s) => s.clearRoomPreview);
	// Ausente no store = expandida (padrão) — só passamos a gravar quando o
	// usuário mexe explicitamente no chevron.
	const expanded = useDashboardPreviewStore(
		(s) => s.expandedByRoom[roomKey] ?? true,
	);
	const setRoomExpanded = useDashboardPreviewStore((s) => s.setRoomExpanded);

	const overrideDevices = override
		?.map((id) => devices.find((d) => d.id === id))
		.filter((d): d is Device => Boolean(d));

	const previewDevices =
		overrideDevices && overrideDevices.length > 0
			? overrideDevices
			: selectRowPreview(devices);
	const hasMore = devices.length > previewDevices.length;

	const handleViewAll = () => {
		if (roomId) setSelectedRoomId(roomId);
		navigate("/devices");
	};

	return (
		<Collapsible
			open={expanded}
			onOpenChange={(open) => setRoomExpanded(roomKey, open)}
			className="flex flex-col gap-3"
		>
			<div className="flex w-full items-center justify-between border-b border-[#46464b]/20 pb-2">
				<button
					type="button"
					onClick={() => setRoomExpanded(roomKey, !expanded)}
					className="flex items-center gap-2 cursor-pointer group"
				>
					<RoomIcon className="w-4 h-4 text-[#c5c6cf]/80 group-hover:text-[#c5c6cf] transition-colors" />
					<h3 className="text-[10px] font-semibold tracking-wider text-[#c7c6cb] uppercase">
						{title}
					</h3>
					<span className="text-[10px] text-[#c7c6cb]/60">
						({devices.length})
					</span>
				</button>

				<div className="flex items-center gap-1">
					<button
						type="button"
						onClick={() => setIsEditOpen(true)}
						aria-label={t(
							"roomSection.editTitle",
							"Escolher dispositivos exibidos",
						)}
						className="rounded-md p-1 text-[#c7c6cb] transition-colors hover:bg-[#2a2a2a] hover:text-[#e5e2e2] cursor-pointer"
					>
						<Pencil className="h-3.5 w-3.5" />
					</button>
					<button
						type="button"
						onClick={() => setRoomExpanded(roomKey, !expanded)}
						aria-label={t("roomSection.toggleExpand", "Expandir/recolher")}
						className="rounded-md p-1 text-[#c7c6cb] transition-colors hover:bg-[#2a2a2a] hover:text-[#e5e2e2] cursor-pointer"
					>
						<ChevronDown
							className={`h-4 w-4 transition-transform duration-200 ${expanded ? "" : "-rotate-90"}`}
						/>
					</button>
				</div>
			</div>

			<CollapsibleContent className="flex flex-col gap-3">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					{previewDevices.map((device) => (
						<DeviceCard key={device.id} device={device} />
					))}
				</div>

				{hasMore && (
					<button
						type="button"
						onClick={handleViewAll}
						className="flex items-center justify-center gap-1.5 rounded-lg border border-[#46464b]/20 bg-[#1c1b1c] py-2 text-xs font-medium text-[#c7c6cb] transition-colors hover:bg-[#201f20] hover:text-[#e5e2e2] cursor-pointer"
					>
						{t("roomSection.viewAllDevices", "Ver todos os dispositivos")}
						<ChevronRight className="h-3.5 w-3.5" />
					</button>
				)}
			</CollapsibleContent>

			<EditRoomPreviewModal
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				devices={devices}
				selectedIds={previewDevices.map((d) => d.id)}
				onSave={(ids) => setRoomPreview(roomKey, ids)}
				onReset={() => clearRoomPreview(roomKey)}
			/>
		</Collapsible>
	);
}
