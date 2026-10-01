import { Search } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CardErrorFallback } from "@/core/components/feedback/CardErrorFallback";
import { normalizeSearchText } from "../../lib/scene-view";
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
	onSetRoom: (roomDevices: SceneDevice[], include: boolean) => void;
	onSelectLights: () => void;
	onAllOff: () => void;
	onClear: () => void;
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

const SHORTCUT_CLASSNAME =
	"h-8 cursor-pointer rounded-full border border-border-subtle px-3 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50";

/**
 * Seleção de dispositivos da cena: busca, atalhos em massa ("todas as luzes", "desligar
 * tudo na cena") e a lista agrupada por ambiente, com "marcar todos" por ambiente.
 * Só chegam aqui dispositivos que uma cena controla.
 */
export function SceneDevicePicker({
	devices,
	items,
	isLoading,
	isError,
	onRetry,
	onToggleIncluded,
	onChangeItem,
	onSetRoom,
	onSelectLights,
	onAllOff,
	onClear,
}: SceneDevicePickerProps) {
	const { t } = useTranslation("scenes");
	const [query, setQuery] = useState("");

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

	const needle = normalizeSearchText(query);
	const visibleDevices = needle
		? devices.filter(
				(device) =>
					normalizeSearchText(device.name).includes(needle) ||
					normalizeSearchText(device.room ?? "").includes(needle),
			)
		: devices;
	const itemByDevice = new Map(items.map((item) => [item.deviceId, item]));

	return (
		<div className="flex flex-col gap-4">
			<label className="flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-surface-container px-3 text-muted-foreground focus-within:border-primary/50">
				<Search className="h-4 w-4 shrink-0" aria-hidden />
				<input
					type="search"
					aria-label={t("editor.deviceSearchLabel")}
					placeholder={t("editor.deviceSearchPlaceholder")}
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
				/>
			</label>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("editor.shortcuts")}
				</span>
				<button
					type="button"
					onClick={onSelectLights}
					className={SHORTCUT_CLASSNAME}
				>
					{t("editor.shortcutLights")}
				</button>
				<button type="button" onClick={onAllOff} className={SHORTCUT_CLASSNAME}>
					{t("editor.shortcutAllOff")}
				</button>
				<button type="button" onClick={onClear} className={SHORTCUT_CLASSNAME}>
					{t("editor.shortcutClear")}
				</button>
			</div>

			{visibleDevices.length === 0 ? (
				<p className="rounded-xl border border-dashed border-border-subtle p-4 text-center text-sm text-muted-foreground">
					{t("editor.noResults")}
				</p>
			) : (
				groupByRoom(visibleDevices, t("editor.noRoom")).map(
					([room, roomDevices]) => {
						const allIncluded = roomDevices.every((device) =>
							itemByDevice.has(device.id),
						);

						return (
							<section key={room} className="flex flex-col gap-2">
								<div className="flex items-center justify-between gap-2">
									<h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
										{room}
									</h4>
									<button
										type="button"
										aria-label={
											allIncluded
												? t("editor.removeRoomLabel", { room })
												: t("editor.includeRoomLabel", { room })
										}
										onClick={() => onSetRoom(roomDevices, !allIncluded)}
										className="cursor-pointer rounded-md px-1 text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
									>
										{allIncluded
											? t("editor.removeRoom")
											: t("editor.includeRoom")}
									</button>
								</div>
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
						);
					},
				)
			)}
		</div>
	);
}
