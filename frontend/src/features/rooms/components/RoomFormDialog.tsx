import { zodResolver } from "@hookform/resolvers/zod";
import { Home, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormGlobalError } from "@/core/components/forms/FormGlobalError";
import { Button } from "@/core/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog";
import { cn } from "@/core/utils";
import { ROOM_ICON_OPTIONS } from "../constants/rooms.constants";
import { useAssignableDevices } from "../hooks/useAssignableDevices";
import { useAssignDeviceToRoom } from "../hooks/useAssignDeviceToRoom";
import { useCreateRoom } from "../hooks/useCreateRoom";
import { useUpdateRoom } from "../hooks/useUpdateRoom";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import {
	type CreateRoomFormInput,
	type CreateRoomFormOutput,
	createRoomSchema,
} from "../types/room.schemas";
import type { RoomDeviceAssignmentPayload } from "../types/room-devices.types";
import { RoomDeviceAssignmentPicker } from "./RoomDeviceAssignmentPicker";

function FormSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
				{title}
			</h3>
			{children}
		</div>
	);
}

/**
 * Formulário único de criação/edição de ambiente (Dialog, sem stepper) —
 * mesma estrutura do `AutomationEditModal`: header fixo, corpo com scroll
 * interno, rodapé fixo. `deviceIds` não é persistido no próprio Room (o
 * back-end não aceita esse campo em Create/UpdateRoomCommand — a atribuição
 * é uma propriedade do `Device`, `roomId`) — no submit, cada dispositivo
 * cujo checkbox mudou de estado recebe um PUT individual via
 * `useAssignDeviceToRoom` (mesmo endpoint `/devices/{id}` usado pela feature
 * `devices`, chamado aqui localmente pra preservar o isolamento do FSD).
 */
export function RoomFormDialog() {
	const isCreateDialogOpen = useRoomsUIStore((s) => s.isCreateDialogOpen);
	const editingRoom = useRoomsUIStore((s) => s.editingRoom);
	const focusDevices = useRoomsUIStore((s) => s.editDialogFocusDevices);
	const closeFormDialog = useRoomsUIStore((s) => s.closeFormDialog);

	const mode: "create" | "edit" = editingRoom ? "edit" : "create";
	const isOpen = isCreateDialogOpen || Boolean(editingRoom);

	const createRoom = useCreateRoom();
	const updateRoom = useUpdateRoom();
	const assignDevice = useAssignDeviceToRoom();
	const { data: devices = [] } = useAssignableDevices();

	const isMutating =
		createRoom.isPending || updateRoom.isPending || assignDevice.isPending;

	const {
		register,
		control,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors, isDirty },
	} = useForm<CreateRoomFormInput, undefined, CreateRoomFormOutput>({
		resolver: zodResolver(createRoomSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: { name: "", icon: "chair" },
	});

	const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
	const initialDeviceIdsRef = useRef<string[]>([]);
	const deviceSectionRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: só deve rodar quando o Dialog abre/fecha ou troca de ambiente — não a cada refetch de `devices`
	useEffect(() => {
		if (!isOpen) {
			reset();
			setSelectedDeviceIds([]);
			initialDeviceIdsRef.current = [];
			return;
		}

		if (editingRoom) {
			reset({ name: editingRoom.name, icon: editingRoom.icon ?? "chair" });
			const assigned = devices
				.filter((device) => device.roomId === editingRoom.id)
				.map((device) => device.id);
			setSelectedDeviceIds(assigned);
			initialDeviceIdsRef.current = assigned;
		} else {
			reset({ name: "", icon: "chair" });
			setSelectedDeviceIds([]);
			initialDeviceIdsRef.current = [];
		}

		setFocus("name");
	}, [isOpen, editingRoom, reset, setFocus]);

	useEffect(() => {
		if (isOpen && focusDevices) {
			deviceSectionRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, [isOpen, focusDevices]);

	const isDeviceSelectionDirty =
		selectedDeviceIds.length !== initialDeviceIdsRef.current.length ||
		selectedDeviceIds.some((id) => !initialDeviceIdsRef.current.includes(id));
	const hasChanges = isDirty || isDeviceSelectionDirty;

	const handleClose = () => {
		if (hasChanges) {
			const confirmed = confirm(
				"Descartar as alterações feitas nesse ambiente?",
			);
			if (!confirmed) return;
		}
		closeFormDialog();
	};

	const syncDeviceAssignments = async (roomId: string) => {
		const initial = initialDeviceIdsRef.current;
		const added = selectedDeviceIds.filter((id) => !initial.includes(id));
		const removed = initial.filter((id) => !selectedDeviceIds.includes(id));

		const buildPayload = (
			device: (typeof devices)[number],
			nextRoomId: string | null,
		): RoomDeviceAssignmentPayload => ({
			name: device.name,
			brand: device.brand,
			externalId: device.externalId,
			type: device.type,
			integrationType: device.integrationType,
			roomId: nextRoomId,
		});

		const tasks = [...added, ...removed]
			.map((id) => {
				const device = devices.find((d) => d.id === id);
				if (!device) return null;
				const nextRoomId = added.includes(id) ? roomId : null;
				return assignDevice.mutateAsync({
					id,
					payload: buildPayload(device, nextRoomId),
				});
			})
			.filter((task) => task !== null);

		if (tasks.length > 0) await Promise.all(tasks);
	};

	const onSubmit = (data: CreateRoomFormOutput) => {
		if (mode === "create") {
			createRoom.mutate(
				{ name: data.name, icon: data.icon ?? null },
				{
					onSuccess: async (result) => {
						await syncDeviceAssignments(result.roomId);
						closeFormDialog();
					},
				},
			);
			return;
		}

		if (!editingRoom) return;
		updateRoom.mutate(
			{
				id: editingRoom.id,
				payload: { name: data.name, icon: data.icon ?? null },
			},
			{
				onSuccess: async () => {
					await syncDeviceAssignments(editingRoom.id);
					closeFormDialog();
				},
			},
		);
	};

	const mutationError = createRoom.error?.message ?? updateRoom.error?.message;

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) handleClose();
			}}
		>
			<DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-2xl">
				<div className="flex max-h-[85vh] flex-col">
					<div className="flex items-start gap-4 border-b border-border-subtle/20 p-6 pb-4">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
							<Home className="h-5 w-5" />
						</span>
						<DialogHeader className="gap-1">
							<DialogTitle className="text-lg">
								{mode === "create" ? "Novo Ambiente" : "Editar Ambiente"}
							</DialogTitle>
							<DialogDescription className="text-xs">
								{mode === "create"
									? "Cadastre um novo cômodo pra organizar seus dispositivos."
									: "Altere o nome, o ícone ou os dispositivos deste ambiente."}
							</DialogDescription>
						</DialogHeader>
					</div>

					<div className="relative min-h-0 flex-1">
						<div className="h-full overflow-y-auto p-6">
							<div className="flex flex-col gap-6">
								<FormGlobalError error={mutationError} />

								<FormSection title="Nome do ambiente">
									<input
										id="room-name"
										type="text"
										placeholder="Ex: Sala de Estar, Cozinha, Escritório"
										maxLength={50}
										aria-invalid={!!errors.name}
										className="h-8 w-full rounded-lg border border-border-subtle/20 bg-surface-high px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
										{...register("name")}
									/>
									<p className="min-h-[18px] text-xs text-alert-foreground">
										{errors.name?.message}
									</p>
								</FormSection>

								<FormSection title="Ícone do ambiente">
									<Controller
										control={control}
										name="icon"
										render={({ field }) => (
											<div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
												{ROOM_ICON_OPTIONS.map((option) => {
													const IconComponent = option.icon;
													const isSelected = field.value === option.id;

													return (
														<button
															key={option.id}
															type="button"
															onClick={() => field.onChange(option.id)}
															aria-pressed={isSelected}
															className={cn(
																"flex flex-col items-center justify-center gap-1 rounded-lg border p-2 transition-colors cursor-pointer",
																isSelected
																	? "border-primary/40 bg-primary/10 text-primary"
																	: "border-border-subtle/20 bg-surface-high text-muted-foreground hover:text-foreground",
															)}
														>
															<IconComponent className="h-5 w-5" />
														</button>
													);
												})}
											</div>
										)}
									/>
									{errors.icon?.message && (
										<p className="text-xs text-alert-foreground">
											{errors.icon.message}
										</p>
									)}
								</FormSection>

								<div ref={deviceSectionRef}>
									<FormSection title="Atribuir dispositivos (opcional)">
										<RoomDeviceAssignmentPicker
											selectedIds={selectedDeviceIds}
											onChange={setSelectedDeviceIds}
											disabled={isMutating}
										/>
									</FormSection>
								</div>
							</div>
						</div>
						<div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-popover to-transparent" />
					</div>

					<div className="flex items-center justify-end gap-2 border-t border-border-subtle/20 bg-surface-low p-4">
						<Button
							type="button"
							variant="outline"
							onClick={handleClose}
							disabled={isMutating}
						>
							Cancelar
						</Button>
						<Button
							type="button"
							onClick={handleSubmit(onSubmit)}
							disabled={isMutating}
						>
							{isMutating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
							{mode === "create" ? "Criar Ambiente" : "Salvar Alterações"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
