import { zodResolver } from "@hookform/resolvers/zod";
import {
	BadgeInfo,
	Cpu,
	Home,
	Layers,
	Loader2,
	MapPin,
	Network,
	QrCode,
	Router,
	Sliders,
} from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { formatIpAddress } from "@/core/utils/formatters";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { useDevice } from "../hooks/useDevice";
import { useUpdateDevice } from "../hooks/useUpdateDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type UpdateDeviceFormInput,
	type UpdateDeviceFormOutput,
	updateDeviceSchema,
} from "../types/device.schemas";
import { DEVICE_TYPE_LABELS, DeviceTypeEnum } from "../types/devices.types";

export const EditDeviceSheet: React.FC = () => {
	const { editingDevice, closeEditSheet } = useDevicesUIStore();
	const isOpen = Boolean(editingDevice);

	const { data: device, isLoading: isLoadingDevice } = useDevice(
		editingDevice?.id ?? "",
	);
	const {
		mutate: updateDevice,
		isPending: isUpdating,
		error: updateError,
	} = useUpdateDevice();
	const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();

	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<UpdateDeviceFormInput, undefined, UpdateDeviceFormOutput>({
		resolver: zodResolver(updateDeviceSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		values: device
			? {
					name: device.name,
					brand: device.brand,
					externalId: device.externalId,
					ipAddress: device.ipAddress ?? null,
					type: device.type,
					roomId: device.roomId ?? "",
				}
			: undefined,
	});

	const selectedType = useWatch({
		control,
		name: "type",
	});

	useEffect(() => {
		if (!isOpen) {
			reset();
		}
	}, [isOpen, reset]);

	const onSubmit = (data: UpdateDeviceFormOutput) => {
		if (!editingDevice?.id) return;

		updateDevice(
			{
				id: editingDevice.id,
				payload: {
					name: data.name,
					brand: data.brand,
					externalId: data.externalId,
					ipAddress: data.ipAddress,
					type: data.type,
					roomId: data.roomId,
				},
			},
			{
				onSuccess: () => {
					closeEditSheet();
				},
			},
		);
	};

	// Mapeia os tipos de dispositivo limpos
	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABELS).map(
		([value, label]) => ({
			value: Number(value),
			label,
		}),
	);

	// Mapeia os cômodos vindos da API
	const roomOptions = [
		{ value: "", label: "Nenhum (Sem cômodo)" },
		...rooms.map((room) => ({
			value: room.id,
			label: room.name,
		})),
	];

	const isBusy = isUpdating || isLoadingDevice;

	return (
		<SheetLayout
			isOpen={isOpen}
			onClose={closeEditSheet}
			onSubmit={handleSubmit(onSubmit)}
			title="Editar Dispositivo" // 👈 Atualizado de "Configurar Dispositivo" para "Editar Dispositivo"
			description="Altere as informações cadastrais ou mude o cômodo do dispositivo."
			footer={
				<>
					<button
						type="button"
						onClick={closeEditSheet}
						disabled={isBusy}
						className="rounded-md border border-zinc-800 bg-transparent px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 disabled:opacity-50 cursor-pointer"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={isBusy}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-indigo-600 px-6 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] disabled:opacity-50 cursor-pointer group"
					>
						{isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						<span className="relative z-10">Salvar Alterações</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			{isLoadingDevice ? (
				<div className="flex h-48 flex-col items-center justify-center gap-2 text-zinc-400">
					<Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
					<span className="text-xs">Carregando especificações...</span>
				</div>
			) : (
				<div className="space-y-4">
					{/* Banner de erro em caso de falha da API C# */}
					<FormGlobalError error={updateError?.message} />

					{/* SEÇÃO 1: Identificação */}
					<div className="space-y-2.5">
						<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
							<BadgeInfo className="h-3.5 w-3.5" />
							<span className="text-[11px] font-bold uppercase tracking-wider">
								Identificação
							</span>
						</div>

						<FormInput
							id="name"
							label="Nome do Dispositivo *"
							placeholder="Ex: Luz Principal da Sala"
							icon={<Cpu className="h-4 w-4" />}
							error={errors.name?.message}
							registration={register("name")}
						/>

						<FormInput
							id="brand"
							label="Marca / Modelo *"
							placeholder="Ex: Philips Hue / Sonoff"
							icon={<Layers className="h-4 w-4" />}
							error={errors.brand?.message}
							registration={register("brand")}
						/>
					</div>

					{/* SEÇÃO 2: Rede & Conectividade */}
					<div className="space-y-2.5 pt-1">
						<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
							<Router className="h-3.5 w-3.5" />
							<span className="text-[11px] font-bold uppercase tracking-wider">
								Rede &amp; Conectividade
							</span>
						</div>

						<FormInput
							id="externalId"
							label="Identificador Externo / MAC *"
							placeholder="00:1B:44:11:3A:B7"
							icon={<QrCode className="h-4 w-4" />}
							error={errors.externalId?.message}
							registration={register("externalId")}
							className="font-mono"
						/>

						{/* Exibe ou esconde o IP dependendo da lógica do dispositivo ou exibe como opcional */}
						{selectedType === DeviceTypeEnum.Television ? (
							<FormInput
								id="ipAddress"
								label="Endereço IP (Local) *"
								placeholder="192.168.1.50"
								icon={<Network className="h-4 w-4" />}
								error={errors.ipAddress?.message}
								registration={register("ipAddress")}
								mask={formatIpAddress}
								maxLength={15}
								className="font-mono"
							/>
						) : (
							<FormInput
								id="ipAddress"
								label="Endereço IP (Local - Opcional)"
								placeholder="192.168.1.50"
								icon={<Network className="h-4 w-4" />}
								error={errors.ipAddress?.message}
								registration={register("ipAddress")}
								mask={formatIpAddress}
								maxLength={15}
								className="font-mono"
							/>
						)}
					</div>

					{/* SEÇÃO 3: Classificação */}
					<div className="space-y-2.5 pt-1">
						<div className="flex items-center gap-2 border-b border-zinc-800/80 pb-1.5 text-indigo-400">
							<MapPin className="h-3.5 w-3.5" />
							<span className="text-[11px] font-bold uppercase tracking-wider">
								Classificação
							</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							<FormSelect
								id="type"
								name="type"
								control={control}
								label="Tipo de Atuador"
								placeholder="Selecione..."
								icon={<Sliders className="h-4 w-4" />}
								error={errors.type?.message}
								options={deviceTypeOptions}
							/>

							<FormSelect
								id="roomId"
								name="roomId"
								control={control}
								label="Cômodo"
								placeholder={
									isLoadingRooms ? "Carregando cômodos..." : "Selecione..."
								}
								icon={<Home className="h-4 w-4" />}
								error={errors.roomId?.message}
								options={roomOptions}
								disabled={isLoadingRooms}
							/>
						</div>
					</div>
				</div>
			)}
		</SheetLayout>
	);
};
