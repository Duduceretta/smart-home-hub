import { zodResolver } from "@hookform/resolvers/zod";
import {
	BadgeInfo,
	Cpu,
	Home,
	Layers,
	Loader2,
	MapPin,
	QrCode,
	Router,
	Sliders,
} from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { useCreateDevice } from "../hooks/useCreateDevice";
import { useDevicesUIStore } from "../store/devices-ui.store";
import {
	type CreateDeviceFormInput,
	type CreateDeviceFormOutput,
	createDeviceSchema,
} from "../types/device.schemas";
import { DeviceTypeEnum } from "../types/devices.types";

export const CreateDeviceSheet: React.FC = () => {
	const { isCreateSheetOpen, closeCreateSheet } = useDevicesUIStore();
	const { mutate: createDevice, isPending } = useCreateDevice();

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
			type: 0,
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
			{/* Seção 1: Identificação (Delay 100ms) */}
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

			{/* Seção 2: Rede & Conectividade (Delay 200ms) */}
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
			</div>

			{/* Seção 3: Classificação (Delay 300ms) */}
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
							{ value: DeviceTypeEnum.Thermostat, label: "Climatização (4)" },
							{ value: DeviceTypeEnum.Camera, label: "Câmera Wi-Fi (5)" },
							{ value: DeviceTypeEnum.Lock, label: "Fechadura (6)" },
							{ value: DeviceTypeEnum.Alarm, label: "Alarme (7)" },
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
		</SheetLayout>
	);
};
