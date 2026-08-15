import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormInput } from "@/core/components/forms/FormInput";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { Label } from "@/core/components/ui/label";
import { GROUP_ICON_OPTIONS } from "../constants/device-groups.constants";
import { useUpdateDeviceGroup } from "../hooks/useUpdateDeviceGroup";
import { useDeviceGroupsUIStore } from "../store/device-groups-ui.store";
import {
	type UpdateDeviceGroupFormInput,
	type UpdateDeviceGroupFormOutput,
	updateDeviceGroupSchema,
} from "../types/device-group.schemas";
import { DeviceGroupMultiSelect } from "./DeviceGroupMultiSelect";

export const EditDeviceGroupSheet: React.FC = () => {
	const { editingGroup, closeEditSheet } = useDeviceGroupsUIStore();
	const isOpen = Boolean(editingGroup);

	const { mutate: updateDeviceGroup, isPending } = useUpdateDeviceGroup();

	const {
		register,
		control,
		handleSubmit,
		reset,
		formState: { errors },
	} = useForm<UpdateDeviceGroupFormInput, undefined, UpdateDeviceGroupFormOutput>(
		{
			resolver: zodResolver(updateDeviceGroupSchema),
			mode: "onSubmit",
			reValidateMode: "onChange",
			values: editingGroup
				? {
						name: editingGroup.name,
						icon: editingGroup.icon ?? "",
						deviceIds: editingGroup.devices.map((device) => device.id),
					}
				: undefined,
		},
	);

	useEffect(() => {
		if (!isOpen) {
			reset();
		}
	}, [isOpen, reset]);

	const onSubmit = (data: UpdateDeviceGroupFormOutput) => {
		if (!editingGroup?.id) return;

		updateDeviceGroup(
			{
				id: editingGroup.id,
				payload: {
					name: data.name,
					icon: data.icon || null,
					deviceIds: data.deviceIds,
				},
			},
			{
				onSuccess: () => {
					closeEditSheet();
				},
			},
		);
	};

	return (
		<SheetLayout
			isOpen={isOpen}
			onClose={closeEditSheet}
			onSubmit={handleSubmit(onSubmit)}
			title="Editar Grupo"
			description="Altere o nome, o ícone ou os dispositivos vinculados a este grupo."
			footer={
				<>
					<button
						type="button"
						onClick={closeEditSheet}
						disabled={isPending}
						className="rounded-md border border-zinc-800 bg-transparent px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 disabled:opacity-50 cursor-pointer"
					>
						Cancelar
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-indigo-600 px-6 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] disabled:opacity-50 cursor-pointer group"
					>
						{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						<span className="relative z-10">Salvar Alterações</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			<div className="space-y-6">
				{/* Campo: Nome do Grupo */}
				<FormInput
					id="name"
					label="Nome do Grupo *"
					placeholder="Ex: Todas as Luzes, Home Theater, Segurança"
					icon={<Boxes className="h-4 w-4" />}
					error={errors.name?.message}
					registration={register("name")}
				/>

				{/* Seletor Visual de Ícone */}
				<div className="space-y-2">
					<Label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
						Ícone do Grupo
					</Label>

					<Controller
						control={control}
						name="icon"
						render={({ field }) => (
							<div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
								{GROUP_ICON_OPTIONS.map((opt) => {
									const IconComp = opt.icon;
									const isSelected = field.value === opt.id;

									return (
										<button
											key={opt.id}
											type="button"
											onClick={() =>
												field.onChange(isSelected ? "" : opt.id)
											}
											className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 transition-all cursor-pointer ${
												isSelected
													? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
													: "border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
											}`}
										>
											<IconComp className="h-6 w-6" />
											<span className="text-[10px] font-medium">
												{opt.label}
											</span>
										</button>
									);
								})}
							</div>
						)}
					/>
				</div>

				{/* Seletor Múltiplo de Dispositivos */}
				<Controller
					control={control}
					name="deviceIds"
					render={({ field }) => (
						<DeviceGroupMultiSelect
							id="deviceIds"
							label="Dispositivos do Grupo *"
							selectedIds={field.value ?? []}
							onChange={field.onChange}
							error={errors.deviceIds?.message}
						/>
					)}
				/>
			</div>
		</SheetLayout>
	);
};
