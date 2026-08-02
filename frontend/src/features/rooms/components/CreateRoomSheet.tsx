import { zodResolver } from "@hookform/resolvers/zod";
import { Home, Loader2, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { FormInput } from "@/core/components/forms/FormInput";
import { SheetLayout } from "@/core/components/layouts/SheetLayout";
import { Label } from "@/core/components/ui/label";
import { ROOM_ICON_OPTIONS } from "../constants/rooms.constants";
import { useCreateRoom } from "../hooks/useCreateRoom";
import { useRoomsUIStore } from "../store/rooms-ui.store";
import {
	type CreateRoomFormInput,
	type CreateRoomFormOutput,
	createRoomSchema,
} from "../types/room.schemas";

export const CreateRoomSheet: React.FC = () => {
	const { isCreateSheetOpen, closeCreateSheet } = useRoomsUIStore();
	const { mutate: createRoom, isPending } = useCreateRoom();

	const {
		register,
		control,
		handleSubmit,
		reset,
		setFocus,
		formState: { errors },
	} = useForm<CreateRoomFormInput, undefined, CreateRoomFormOutput>({
		resolver: zodResolver(createRoomSchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: {
			name: "",
			icon: "chair",
		},
	});

	useEffect(() => {
		if (isCreateSheetOpen) {
			setFocus("name");
		} else {
			reset();
		}
	}, [isCreateSheetOpen, reset, setFocus]);

	const onSubmit = (data: CreateRoomFormOutput) => {
		createRoom(
			{
				name: data.name,
				icon: data.icon ?? null,
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
			title="Adicionar Novo Ambiente"
			description="Crie um novo cômodo físico para alocar e organizar seus dispositivos inteligentes."
			footer={
				<>
					<button
						type="button"
						onClick={closeCreateSheet}
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
						<span className="relative z-10">Registrar Ambiente</span>
						<div className="absolute inset-0 bg-white/20 translate-y-full transition-transform duration-300 ease-out group-hover:translate-y-0" />
					</button>
				</>
			}
		>
			<div className="space-y-6">
				{/* Campo: Nome do Ambiente */}
				<FormInput
					id="name"
					label="Nome do Ambiente *"
					placeholder="Ex: Sala de Estar, Cozinha, Escritório"
					icon={<Home className="h-4 w-4" />}
					error={errors.name?.message}
					registration={register("name")}
				/>

				{/* Seletor Visual de Ícone */}
				<div className="space-y-2">
					<Label className="text-xs font-medium uppercase tracking-wide text-zinc-400">
						Ícone do Ambiente
					</Label>

					<Controller
						control={control}
						name="icon"
						render={({ field }) => (
							<div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
								{ROOM_ICON_OPTIONS.map((opt) => {
									const IconComp = opt.icon;
									const isSelected = field.value === opt.id;

									return (
										<button
											key={opt.id}
											type="button"
											onClick={() => field.onChange(opt.id)}
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

				{/* Card Informativo de Dica de Automação */}
				<div className="relative overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-4">
					<div className="pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl" />
					<div className="relative z-10 flex items-center gap-2 text-xs font-semibold text-indigo-400">
						<Sparkles className="h-4 w-4" />
						<span>Dica de Automação Espacial</span>
					</div>
					<p className="relative z-10 mt-1 text-xs text-zinc-400 leading-relaxed">
						Ambientes criados ficam disponíveis imediatamente para vinculação na
						aba de Dispositivos. Isso facilita a criação de rotinas como
						"Desligar tudo na Sala".
					</p>
				</div>
			</div>
		</SheetLayout>
	);
};
