import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
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
        if (!isCreateSheetOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") closeCreateSheet();
        };

        document.addEventListener("keydown", handleKeyDown);
        document.body.style.overflow = "hidden";
        setFocus("name");

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "";
            reset();
        };
    }, [isCreateSheetOpen, closeCreateSheet, reset, setFocus]);

    const onSubmit = (data: CreateDeviceFormOutput) => {
        createDevice(
            {
                name: data.name,
                brand: data.brand,
                externalId: data.externalId,
                type: data.type,
                roomId: data.roomId,
            },
            {
                onSuccess: () => {
                    reset();
                    closeCreateSheet();
                },
            },
        );
    };

    if (!isCreateSheetOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <button
                type="button"
                onClick={closeCreateSheet}
                aria-label="Fechar painel clicando no fundo"
                className="absolute inset-0 h-full w-full border-none bg-black/60 backdrop-blur-sm cursor-default animate-fade-in"
            />

            <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="sheet-title"
                    className="w-full max-w-md border-l border-zinc-800/80 bg-zinc-900 shadow-2xl animate-slide-left"
                >
                    <form
                        noValidate
                        onSubmit={handleSubmit(onSubmit)}
                        className="flex h-full flex-col justify-between"
                    >
                        <div>
                            <div className="border-b border-zinc-800/80 bg-zinc-900/50 p-6">
                                <div className="flex items-center justify-between">
                                    <h3
                                        id="sheet-title"
                                        className="text-lg font-semibold text-zinc-50"
                                    >
                                        Adicionar Novo Dispositivo
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={closeCreateSheet}
                                        aria-label="Fechar painel"
                                        className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100 cursor-pointer"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>
                                <p className="mt-1 text-xs text-zinc-400">
                                    Preencha as especificações técnicas para vincular ao Smart Hub.
                                </p>
                            </div>

                            <div className="p-6 space-y-4 text-sm">
                                <div>
                                    <label
                                        htmlFor="name"
                                        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
                                    >
                                        Nome do Dispositivo
                                    </label>
                                    <input
                                        id="name"
                                        {...register("name")}
                                        type="text"
                                        placeholder="Ex: Luz Principal"
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-xs text-red-400">
                                            {errors.name.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="brand"
                                        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
                                    >
                                        Marca / Modelo
                                    </label>
                                    <input
                                        id="brand"
                                        {...register("brand")}
                                        type="text"
                                        placeholder="Ex: Philips Hue"
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                                    />
                                    {errors.brand && (
                                        <p className="mt-1 text-xs text-red-400">
                                            {errors.brand.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label
                                        htmlFor="externalId"
                                        className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
                                    >
                                        Identificador Externo / MAC
                                    </label>
                                    <input
                                        id="externalId"
                                        {...register("externalId")}
                                        type="text"
                                        placeholder="00:1B:44:11:3A:B7"
                                        className="w-full font-mono rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                                    />
                                    {errors.externalId && (
                                        <p className="mt-1 text-xs text-red-400">
                                            {errors.externalId.message}
                                        </p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label
                                            htmlFor="type"
                                            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
                                        >
                                            Tipo
                                        </label>
                                        <select
                                            id="type"
                                            {...register("type")}
                                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                                        >
                                            <option value={0}>Selecione...</option>
                                            <option value={DeviceTypeEnum.Light}>Lâmpada (1)</option>
                                            <option value={DeviceTypeEnum.Switch}>Tomada / Relé (2)</option>
                                            <option value={DeviceTypeEnum.Sensor}>Sensor de Ambiente (3)</option>
                                            <option value={DeviceTypeEnum.Thermostat}>Ar Condicionado / Termostato (4)</option>
                                            <option value={DeviceTypeEnum.Camera}>Câmera de Monitoramento (5)</option>
                                            <option value={DeviceTypeEnum.Lock}>Fechadura Inteligente (6)</option>
                                            <option value={DeviceTypeEnum.Alarm}>Alarme de Segurança (7)</option>
                                        </select>
                                        {errors.type && (
                                            <p className="mt-1 text-xs text-red-400">
                                                {errors.type.message}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="roomId"
                                            className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-400"
                                        >
                                            Cômodo (Opcional)
                                        </label>
                                        <select
                                            id="roomId"
                                            {...register("roomId")}
                                            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-zinc-100 focus:border-indigo-500 focus:outline-none"
                                        >
                                            <option value="">Sem cômodo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t border-zinc-800/80 bg-zinc-900/50 p-6">
                            <button
                                type="button"
                                onClick={closeCreateSheet}
                                disabled={isPending}
                                className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 cursor-pointer disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-indigo-500 cursor-pointer shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                            >
                                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Registrar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
