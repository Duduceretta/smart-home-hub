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
import { useForm } from "react-hook-form";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { formatIpAddress, formatMacAddress } from "@/core/utils/formatters";
import { useRooms } from "@/features/rooms/hooks/useRooms";
import { useCreateDevice } from "../hooks/useCreateDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type CreateDeviceFormInput,
	type CreateDeviceFormOutput,
	createDeviceSchema,
} from "../types/device.schemas";
import { DEVICE_TYPE_LABELS, DeviceTypeEnum } from "../types/devices.types";

export const CreateDeviceSheet: React.FC = () => {
	const { isCreateSheetOpen, closeCreateSheet } = useDevicesUIStore();
	const {
		mutate: createDevice,
		isPending,
		error: mutationError,
	} = useCreateDevice();
	const { data: rooms = [], isLoading: isLoadingRooms } = useRooms();

	const {
		register,
		control,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = useForm<CreateDeviceFormInput, undefined, CreateDeviceFormOutput>({
		resolver: zodResolver(createDeviceSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: {
			name: "",
			brand: "",
			externalId: "",
			ipAddress: "",
			type: DeviceTypeEnum.Light,
			roomId: "",
		},
	});

	useEffect(() => {
		if (isCreateSheetOpen) {
			setFocus("name");
		} else {
			reset();
		}
	}, [isCreateSheetOpen, reset, setFocus]);

	const onSubmit = (data: CreateDeviceFormOutput) => {
		createDevice(data, {
			onSuccess: () => {
				reset();
				closeCreateSheet();
			},
		});
	};

	const deviceTypeOptions = Object.entries(DEVICE_TYPE_LABELS).map(
		([value, label]) => ({
			value: Number(value),
			label,
		}),
	);

	const roomOptions = [
		{ value: "", label: "Nenhum (Sem cômodo)" },
		...rooms.map((room) => ({
			value: room.id,
			label: room.name,
		})),
	];

	return (
		<SheetLayout
			isOpen={isCreateSheetOpen}
			onClose={closeCreateSheet}
			onSubmit={handleSubmit(onSubmit)}
			title="Adicionar Novo Dispositivo"
			description="Preencha as especificações técnicas para vincular ao Smart Hub."
			footer={
				<>
					<button
						type="button"
						onClick={closeCreateSheet}
						disabled={isPending}
						className="rounded-md border border-[#27272a] bg-transparent px-4 py-2 text-xs font-medium text-[#d4d4d8] transition-colors hover:border-[#52525b] disabled:opacity-50 cursor-pointer"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-[#6366f1] px-6 py-2 text-xs font-medium text-white transition-all hover:bg-[#4f46e5] hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] disabled:opacity-50 cursor-pointer group"
					>
						{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						<span className="relative z-10">Registrar</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			{/* Container principal estruturado com space-y-4 e respiro proporcional */}
			<div className="space-y-4">
				<FormGlobalError error={mutationError?.message} />

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
						mask={formatMacAddress}
						maxLength={17}
						className="font-mono"
					/>

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
		</SheetLayout>
	);
};
