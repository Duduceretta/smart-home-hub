import { useTranslation } from "react-i18next";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import type { SceneFormItem } from "../../types/scene.schemas";
import type { SceneDevice } from "../../types/scenes.types";
import { SceneDeviceRow } from "./SceneDeviceRow";

interface SceneDevicePickerProps {
	devices: SceneDevice[];
	items: SceneFormItem[];
	isLoading: boolean;
	isError: boolean;
	onRetry: () => void;
	onToggleIncluded: (device: SceneDevice) => void;
	onChangeItem: (deviceId: string, patch: Partial<SceneFormItem>) => void;
}

/** Agrupa os dispositivos por ambiente, preservando a ordem da API. */
function groupByRoom(devices: SceneDevice[], fallbackRoom: string) {
	const groups = new Map<string, SceneDevice[]>();

	for (const device of devices) {
		const room = device.room?.trim() || fallbackRoom;
		groups.set(room, [...(groups.get(room) ?? []), device]);
	}

	return [...groups.entries()];
}

/**
 * Lista de dispositivos do editor, agrupada por ambiente (como a pessoa pensa na
 * casa: "o que acende na sala"). Só chegam aqui dispositivos que uma cena controla.
 */
export function SceneDevicePicker({
	devices,
	items,
	isLoading,
	isError,
	onRetry,
	onToggleIncluded,
	onChangeItem,
}: SceneDevicePickerProps) {
	const { t } = useTranslation("scenes");

	if (isError) {
		return (
			<CardErrorFallback
				message={t("editor.devicesError")}
				retryLabel={t("page.retry")}
				onRetry={onRetry}
			/>
		);
	}

	if (isLoading) {
		return (
			<div
				role="status"
				aria-busy="true"
				aria-label={t("editor.devicesLoading")}
				className="flex animate-pulse flex-col gap-2"
			>
				{["sk-1", "sk-2", "sk-3"].map((id) => (
					<div key={id} className="h-14 rounded-xl bg-surface-high" />
				))}
			</div>
		);
	}

	if (devices.length === 0) {
		return (
			<p className="rounded-xl border border-dashed border-border-subtle p-4 text-center text-sm text-muted-foreground">
				{t("editor.devicesEmpty")}
			</p>
		);
	}

	const itemByDevice = new Map(items.map((item) => [item.deviceId, item]));

	return (
		<div className="flex flex-col gap-6">
			{groupByRoom(devices, t("editor.noRoom")).map(([room, roomDevices]) => (
				<section key={room} className="flex flex-col gap-2">
					<h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
						{room}
					</h4>
					<ul className="flex flex-col gap-2">
						{roomDevices.map((device) => (
							<SceneDeviceRow
								key={device.id}
								device={device}
								item={itemByDevice.get(device.id)}
								onToggleIncluded={onToggleIncluded}
								onChangeItem={onChangeItem}
							/>
						))}
					</ul>
				</section>
			))}
		</div>
	);
}
