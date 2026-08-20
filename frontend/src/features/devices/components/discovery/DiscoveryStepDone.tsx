import {
	BadgeInfo,
	CheckCircle2,
	Loader2,
	Router,
	Sliders,
} from "lucide-react";
import type { ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { useCreateDevice } from "../../hooks/useCreateDevice";
import { useDevicesUIStore } from "../../store/devices-ui.store";
import {
	DEVICE_TYPE_LABEL_KEYS,
	INTEGRATION_TYPE_LABEL_KEYS,
} from "../../types/devices.types";

const SummaryRow: React.FC<{ label: string; value: string }> = ({
	label,
	value,
}) => (
	<div className="flex items-center justify-between gap-4 py-1.5">
		<span className="text-[11px] text-[#8a898f]">{label}</span>
		<span className="truncate text-xs font-medium text-[#e5e2e2]">{value}</span>
	</div>
);

const SummarySection: React.FC<{
	icon: ComponentType<{ className?: string }>;
	title: string;
	children: React.ReactNode;
}> = ({ icon: Icon, title, children }) => (
	<div className="rounded-lg border border-[#46464b]/30 bg-[#201f20] p-3">
		<div className="flex items-center gap-2 border-b border-[#46464b]/20 pb-1.5 text-[#c5c6cf]">
			<Icon className="h-3.5 w-3.5" />
			<span className="text-[11px] font-bold uppercase tracking-wider">
				{title}
			</span>
		</div>
		<div className="divide-y divide-[#46464b]/20">{children}</div>
	</div>
);

export const DiscoveryStepDone: React.FC = () => {
	const { t } = useTranslation("devices");
	const pendingDevicePayload = useDevicesUIStore((s) => s.pendingDevicePayload);
	const lastCreatedDeviceName = useDevicesUIStore(
		(s) => s.lastCreatedDeviceName,
	);
	const setDiscoveryStep = useDevicesUIStore((s) => s.setDiscoveryStep);
	const setLastCreatedDeviceName = useDevicesUIStore(
		(s) => s.setLastCreatedDeviceName,
	);
	const resetDiscovery = useDevicesUIStore((s) => s.resetDiscovery);
	const closeDiscoveryModal = useDevicesUIStore((s) => s.closeDiscoveryModal);
	const { data: rooms = [] } = useRooms();
	const {
		mutate: createDevice,
		isPending,
		error: mutationError,
	} = useCreateDevice();

	if (lastCreatedDeviceName) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
				<div className="relative flex h-16 w-16 items-center justify-center">
					<span
						className="absolute inset-0 rounded-full bg-[#c5c6cf]/25 blur-xl motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-50 motion-safe:duration-700 motion-safe:ease-out"
						aria-hidden
					/>
					<span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-b from-[#3a393a] to-[#2f2e2f] text-[#c5c6cf] ring-1 ring-[#c5c6cf]/50 shadow-[0_0_16px_rgba(197,198,207,0.25)] motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-500 motion-safe:ease-out">
						<CheckCircle2 className="h-7 w-7 motion-safe:animate-in motion-safe:zoom-in-0 motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-backwards motion-safe:delay-[180ms]" />
					</span>
				</div>
				<div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-300 motion-safe:fill-mode-backwards motion-safe:delay-[320ms]">
					<p className="text-base font-semibold text-[#e5e2e2]">
						{t("discoveryModal.done.title")}
					</p>
					<p className="mt-1 text-sm text-[#c7c6cb]">
						{t("discoveryModal.done.subtitle", {
							name: lastCreatedDeviceName,
						})}
					</p>
				</div>
				<div className="mt-2 flex items-center gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300 motion-safe:fill-mode-backwards motion-safe:delay-[480ms]">
					<button
						type="button"
						onClick={resetDiscovery}
						className="rounded-md border border-[#27272a] bg-transparent px-4 py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:border-[#52525b] cursor-pointer"
					>
						{t("discoveryModal.done.addAnotherButton")}
					</button>
					<button
						type="button"
						onClick={closeDiscoveryModal}
						className="rounded-full border border-[#46464b]/30 bg-linear-to-b from-[#2a2a2a] to-[#232323] px-6 py-2 text-xs font-semibold text-[#e5e2e2] transition-colors hover:from-[#353435] hover:to-[#2a2a2a] cursor-pointer active:scale-[0.98]"
					>
						{t("discoveryModal.done.finishButton")}
					</button>
				</div>
			</div>
		);
	}

	if (!pendingDevicePayload) {
		return null;
	}

	const roomName = pendingDevicePayload.roomId
		? (rooms.find((room) => room.id === pendingDevicePayload.roomId)?.name ??
			t("form.fields.room.none"))
		: t("form.fields.room.none");

	const handleConfirm = () => {
		createDevice(pendingDevicePayload, {
			onSuccess: () => {
				setLastCreatedDeviceName(pendingDevicePayload.name);
			},
		});
	};

	return (
		<div className="flex flex-1 flex-col gap-4">
			<div>
				<h2 className="text-sm font-semibold text-[#e5e2e2]">
					{t("discoveryModal.review.sectionTitle")}
				</h2>
				<p className="mt-0.5 text-[11px] text-[#c7c6cb]">
					{t("discoveryModal.review.sectionSubtitle")}
				</p>
			</div>

			<FormGlobalError error={mutationError?.message} />

			<div className="flex flex-col gap-3 overflow-y-auto">
				<SummarySection
					icon={BadgeInfo}
					title={t("form.sections.identification")}
				>
					<SummaryRow
						label={t("discoveryModal.review.nameLabel")}
						value={pendingDevicePayload.name}
					/>
					<SummaryRow
						label={t("discoveryModal.review.brandLabel")}
						value={pendingDevicePayload.brand}
					/>
				</SummarySection>

				<SummarySection icon={Router} title={t("form.sections.network")}>
					<SummaryRow
						label={t("discoveryModal.review.externalIdLabel")}
						value={pendingDevicePayload.externalId}
					/>
					{pendingDevicePayload.ipAddress && (
						<SummaryRow
							label={t("discoveryModal.review.ipAddressLabel")}
							value={pendingDevicePayload.ipAddress}
						/>
					)}
				</SummarySection>

				<SummarySection
					icon={Sliders}
					title={t("form.sections.classification")}
				>
					<SummaryRow
						label={t("discoveryModal.review.typeLabel")}
						value={t(DEVICE_TYPE_LABEL_KEYS[pendingDevicePayload.type])}
					/>
					<SummaryRow
						label={t("discoveryModal.review.integrationTypeLabel")}
						value={t(
							INTEGRATION_TYPE_LABEL_KEYS[pendingDevicePayload.integrationType],
						)}
					/>
					<SummaryRow
						label={t("discoveryModal.review.roomLabel")}
						value={roomName}
					/>
				</SummarySection>
			</div>

			<div className="mt-auto flex items-center justify-between border-t border-[#46464b]/20 pt-4">
				<button
					type="button"
					onClick={() => setDiscoveryStep("configure")}
					disabled={isPending}
					className="rounded-md border border-[#27272a] bg-transparent px-4 py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:border-[#52525b] disabled:opacity-50 cursor-pointer"
				>
					{t("discoveryModal.review.backButton")}
				</button>
				<button
					type="button"
					onClick={handleConfirm}
					disabled={isPending}
					className="inline-flex items-center gap-2 rounded-full border border-[#46464b]/30 bg-linear-to-b from-[#2a2a2a] to-[#232323] px-6 py-2 text-xs font-semibold text-[#e5e2e2] transition-colors hover:from-[#353435] hover:to-[#2a2a2a] disabled:opacity-50 cursor-pointer active:scale-[0.98]"
				>
					{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
					{t("discoveryModal.review.confirmButton")}
				</button>
			</div>
		</div>
	);
};
