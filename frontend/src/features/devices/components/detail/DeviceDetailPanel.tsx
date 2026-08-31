import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useConfirm } from "@/core/components/providers/ConfirmDialogProvider";
import { Button } from "@/core/components/ui/button";
import { DEVICE_CONFIG } from "../../constants/devices.constants";
import { useDeleteDevice } from "../../hooks/useDeleteDevice";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import {
	type Device,
	DeviceTypeEnum,
	INTEGRATION_TYPE_LABEL_KEYS,
} from "../../types/devices.types";
import { DeviceDetailContent } from "./DeviceDetailContent";

interface DeviceDetailPanelProps {
	device: Device | null;
}

export function DeviceDetailPanel({ device }: DeviceDetailPanelProps) {
	const { t } = useTranslation(["devices", "common"]);
	const location = useLocation();
	const navigate = useNavigate();

	const returnTo = (location.state as { returnTo?: string })?.returnTo;
	const returnLabel = (location.state as { returnLabel?: string })?.returnLabel;

	const confirm = useConfirm();
	const openEditModal = useDevicesUIStore((s) => s.openEditModal);
	const { mutate: deleteDevice, isPending: isDeleting } = useDeleteDevice();

	if (!device) {
		return (
			<div className="flex h-full max-h-full min-h-50 flex-col items-center justify-center rounded-xl border border-dashed border-border-subtle bg-surface-low text-center">
				<p className="text-sm text-muted-foreground">
					{t(
						"detail.selectPrompt",
						"Selecione um dispositivo pra ver os detalhes.",
					)}
				</p>
			</div>
		);
	}

	const config =
		DEVICE_CONFIG[device.type] ?? DEVICE_CONFIG[DeviceTypeEnum.Light];
	const Icon = config.icon;
	const isOnline = device.isOnline;

	const handleDeleteClick = async () => {
		const confirmed = await confirm({
			title: t("deleteModal.title"),
			description: (
				<Trans
					t={t}
					i18nKey="deleteModal.description"
					values={{ name: device.name }}
					components={{
						bold: <span className="font-semibold text-destructive" />,
					}}
				/>
			),
			confirmLabel: t("common:actions.delete"),
			cancelLabel: t("common:actions.cancel"),
			variant: "destructive",
			icon: Trash2,
		});
		if (confirmed) deleteDevice(device.id);
	};

	return (
		<div className="flex h-full max-h-full flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-low shadow-sm">
			<div className="flex shrink-0 items-center justify-between gap-4 border-b border-border-subtle/50 bg-surface-container/50 p-6">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary shadow-xs">
						<Icon className="h-6 w-6" />
					</div>
					<div className="min-w-0">
						<h2 className="truncate text-xl font-semibold tracking-tight text-foreground">
							{device.name}
						</h2>
						<p className="truncate text-sm text-muted-foreground">
							{(device.roomId
								? device.room
								: t(INTEGRATION_TYPE_LABEL_KEYS[device.integrationType])
							).toUpperCase()}{" "}
							•{" "}
							{isOnline
								? device.brand.toUpperCase()
								: t("common:status.offline", "OFFLINE")}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2">
					{returnTo && (
						<Button
							variant="outline"
							className="border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40"
							onClick={() => navigate(returnTo)}
						>
							<ArrowLeft className="h-4 w-4" />
							<span className="hidden sm:inline">
								{t("header.returnTo", {
									label: returnLabel || t("title", "Dispositivos"),
								})}
							</span>
						</Button>
					)}
					<Button
						variant="outline"
						className="border-border-subtle bg-surface-container text-foreground hover:bg-surface-high hover:border-primary/40"
						onClick={() => openEditModal(device)}
					>
						<Pencil className="h-4 w-4" />
						{t("detail.edit", "Editar")}
					</Button>
					<Button
						variant="outline"
						onClick={handleDeleteClick}
						disabled={isDeleting}
						aria-label={t("common:actions.delete")}
						className="border-destructive/30 bg-destructive/10 text-destructive transition-all hover:bg-destructive/20 hover:border-destructive/40 cursor-pointer shadow-xs disabled:cursor-not-allowed"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			<DeviceDetailContent device={device} />
		</div>
	);
}
