import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/core/components/forms/FormInput";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { Label } from "@/core/components/ui/label";
import { GROUP_ICON_OPTIONS } from "../constants/device-groups.constants";
import { useCreateDeviceGroup } from "../hooks/useCreateDeviceGroup";
import { useDeviceGroupsUIStore } from "../store/device-groups-ui.store";
import {
	type CreateDeviceGroupFormInput,
	type CreateDeviceGroupFormOutput,
	createDeviceGroupSchema,
} from "../types/device-group.schemas";
import { DeviceGroupMultiSelect } from "./DeviceGroupMultiSelect";

export const CreateDeviceGroupSheet: React.FC = () => {
	const { t } = useTranslation(["device-groups", "common"]);
	const { isCreateSheetOpen, closeCreateSheet } = useDeviceGroupsUIStore();
	const { mutate: createDeviceGroup, isPending } = useCreateDeviceGroup();

	const {
		register,
		control,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = useForm<CreateDeviceGroupFormInput, undefined, CreateDeviceGroupFormOutput>(
		{
			resolver: zodResolver(createDeviceGroupSchema),
			mode: "onSubmit",
			reValidateMode: "onChange",
			defaultValues: {
				name: "",
				icon: "",
				deviceIds: [],
			},
		},
	);

	useEffect(() => {
		if (isCreateSheetOpen) {
			setFocus("name");
		} else {
			reset();
		}
	}, [isCreateSheetOpen, reset, setFocus]);

	const onSubmit = (data: CreateDeviceGroupFormOutput) => {
		createDeviceGroup(
			{
				name: data.name,
				icon: data.icon || null,
				deviceIds: data.deviceIds,
			},
			{
				onSuccess: () => {
					reset();
					closeCreateSheet();
				},
			},
		);
	};

	return (
		<SheetLayout
			isOpen={isCreateSheetOpen}
			onClose={closeCreateSheet}
			onSubmit={handleSubmit(onSubmit)}
			title={t("form.create.title")}
			description={t("form.create.description")}
			footer={
				<>
					<button
						type="button"
						onClick={closeCreateSheet}
						disabled={isPending}
						className="rounded-md border border-zinc-800 bg-transparent px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 disabled:opacity-50 cursor-pointer"
					>
						{t("common:actions.cancel")}
					</button>
					<button
						type="submit"
						disabled={isPending}
						className="relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-indigo-600 px-6 py-2 text-xs font-medium text-white transition-all hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] disabled:opacity-50 cursor-pointer group"
					>
						{isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
						<span className="relative z-10">{t("form.create.submitButton")}</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			<div className="space-y-6">
				{/* Campo: Nome do Grupo */}
				<FormInput
					id="name"
					label={t("form.fields.name.label")}
					placeholder={t("form.fields.name.placeholder")}
					icon={<Boxes className="h-4 w-4" />}
					error={errors.name?.message}
					registration={register("name")}
				/>

				{/* Seletor Visual de Ícone */}
				<div className="space-y-2">
					<Label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
						{t("form.fields.icon.label")}
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
												{t(opt.labelKey)}
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
							label={t("form.fields.devices.label")}
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
