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
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { useDevice } from "../hooks/useDevice";
import { useUpdateDevice } from "../hooks/useUpdateDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type UpdateDeviceFormInput,
	type UpdateDeviceFormOutput,
	updateDeviceSchema,
} from "../types/device.schemas";
import { DeviceTypeEnum } from "../types/devices.types";

export const EditDeviceSheet: React.FC = () => {
	const { editingDevice, closeEditSheet } = useDevicesUIStore();
	const isOpen = Boolean(editingDevice);

	const { data: device, isLoading } = useDevice(editingDevice?.id ?? "");
	const { mutate: updateDevice, isPending: isUpdating } = useUpdateDevice();

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
			}
		);
	};

	return (
		<SheetLayout
			isOpen={isOpen}
			onClose={closeEditSheet}
			onSubmit={handleSubmit(onSubmit)}
			title="Configurar Dispositivo"
			description="Altere as especificações cadastrais ou transfira o dispositivo de cômodo."
			footer={
				<>
					<button
						type="button"
						onClick={closeEditSheet}
						disabled={isUpdating || isLoading}
						className="rounded-md border border-[#27272a] bg-transparent px-4 py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:border-[#52525b] disabled:opacity-50 cursor-pointer"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={isUpdating || isLoading}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-[#6366f1] px-6 py-2 text-xs font-medium text-white transition-all hover:bg-[#4f46e5] hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] disabled:opacity-50 cursor-pointer group"
					>
						{isUpdating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						<span className="relative z-10">Salvar Alterações</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			{isLoading ? (
				<div className="flex h-48 flex-col items-center justify-center gap-2 text-[#a1a1aa]">
					<Loader2 className="h-6 w-6 animate-spin text-[#6366f1]" />
					<span className="text-xs">Carregando especificações...</span>
				</div>
			) : (
				<>
					<div className="space-y-4 animate-fade-up opacity-0-init delay-100">
						<div className="flex items-center gap-2 border-b border-[#27272a]/50 pb-2 text-[#6366f1]">
							<BadgeInfo className="h-4 w-4" />
							<span className="text-xs font-bold uppercase tracking-wider">
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
							label="Marca / Modelo"
							placeholder="Ex: Philips Hue / Sonoff"
							icon={<Layers className="h-4 w-4" />}
							error={errors.brand?.message}
							registration={register("brand")}
						/>
					</div>

					<div className="space-y-4 pt-2 animate-fade-up opacity-0-init delay-200">
						<div className="flex items-center gap-2 border-b border-[#27272a]/50 pb-2 text-[#6366f1]">
							<Router className="h-4 w-4" />
							<span className="text-xs font-bold uppercase tracking-wider">
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

						{selectedType === DeviceTypeEnum.Television && (
							<FormInput
								id="ipAddress"
								label="Endereço IP (Local) *"
								placeholder="192.168.1.50"
								icon={<Network className="h-4 w-4" />}
								error={errors.ipAddress?.message}
								registration={register("ipAddress")}
								className="font-mono animate-fade-in"
							/>
						)}
					</div>

					<div className="space-y-4 pt-2 animate-fade-up opacity-0-init delay-300">
						<div className="flex items-center gap-2 border-b border-[#27272a]/50 pb-2 text-[#6366f1]">
							<MapPin className="h-4 w-4" />
							<span className="text-xs font-bold uppercase tracking-wider">
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
								options={[
									{ value: DeviceTypeEnum.Light, label: "Iluminação (1)" },
									{ value: DeviceTypeEnum.Switch, label: "Tomada / Relé (2)" },
									{ value: DeviceTypeEnum.Sensor, label: "Sensor (3)" },
									{
										value: DeviceTypeEnum.Thermostat,
										label: "Climatização (4)",
									},
									{ value: DeviceTypeEnum.Camera, label: "Câmera Wi-Fi (5)" },
									{ value: DeviceTypeEnum.Lock, label: "Fechadura (6)" },
									{ value: DeviceTypeEnum.Alarm, label: "Alarme (7)" },
									{ value: DeviceTypeEnum.Television, label: "Eletrodoméstico / TV (8)" },
								]}
							/>

							<FormSelect
								id="roomId"
								name="roomId"
								control={control}
								label="Cômodo (Opcional)"
								placeholder="Selecione..."
								icon={<Home className="h-4 w-4" />}
								error={errors.roomId?.message}
								options={[{ value: "", label: "Sem cômodo" }]}
							/>
						</div>
					</div>
				</>
			)}
		</SheetLayout>
	);
};
