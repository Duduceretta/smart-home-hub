import { zodResolver } from "@hookform/resolvers/zod";
import {
	Loader2,
	Radio,
	Sparkles,
	Thermometer,
	Trash2,
	WifiOff,
	Zap,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { FormInput } from "@/core/components/forms/FormInput";
import { FormSelect } from "@/core/components/forms/FormSelect";
import { Button } from "@/core/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card";
import i18n from "@/core/i18n";
import enDev from "@/core/i18n/locales/en-US/dev.json";
import ptDev from "@/core/i18n/locales/pt-BR/dev.json";
import { useDevices } from "@/features/devices/hooks/useDevices";
import { useClearMockHouse } from "../hooks/useClearMockHouse";
import { useEmitTelemetry } from "../hooks/useEmitTelemetry";
import { useSeedMockHouse } from "../hooks/useSeedMockHouse";
import { useToggleConnectivity } from "../hooks/useToggleConnectivity";
import {
	type EmitTelemetryFormInput,
	type EmitTelemetryFormOutput,
	emitTelemetrySchema,
	type ToggleConnectivityFormInput,
	type ToggleConnectivityFormOutput,
	toggleConnectivitySchema,
} from "../types/dev.schemas";

i18n.addResourceBundle("pt-BR", "dev", ptDev);
i18n.addResourceBundle("en-US", "dev", enDev);

export const DevToolsView: React.FC = () => {
	const { t } = useTranslation(["dev", "common"]);

	const { data: devicesPage } = useDevices({ pageSize: 100 });
	const deviceOptions =
		devicesPage?.items.map((device) => ({
			value: device.id,
			label: `${device.name} (${device.room})`,
		})) ?? [];

	const { mutate: seedMockHouse, isPending: isSeeding } = useSeedMockHouse();
	const { mutate: clearMockHouse, isPending: isClearing } = useClearMockHouse();
	const { mutate: emitTelemetry, isPending: isEmitting } = useEmitTelemetry();
	const { mutate: toggleConnectivity, isPending: isToggling } =
		useToggleConnectivity();

	const telemetryForm = useForm<
		EmitTelemetryFormInput,
		undefined,
		EmitTelemetryFormOutput
	>({
		resolver: zodResolver(emitTelemetrySchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: { deviceId: "", isOn: true },
	});

	const connectivityForm = useForm<
		ToggleConnectivityFormInput,
		undefined,
		ToggleConnectivityFormOutput
	>({
		resolver: zodResolver(toggleConnectivitySchema),
		mode: "onSubmit",
		reValidateMode: "onChange",
		defaultValues: { deviceId: "" },
	});

	const onEmitTelemetry = (data: EmitTelemetryFormOutput) => {
		emitTelemetry({
			deviceId: data.deviceId,
			isOn: data.isOn,
			powerUsageWatts: data.powerUsageWatts ?? null,
			temperatureCelsius: data.temperatureCelsius ?? null,
		});
	};

	const onToggleConnectivity = (isOnline: boolean) => {
		connectivityForm.handleSubmit((data: ToggleConnectivityFormOutput) => {
			toggleConnectivity({ deviceId: data.deviceId, isOnline });
		})();
	};

	return (
		<div className="space-y-6 p-6">
			<div>
				<h1 className="text-lg font-semibold text-foreground">{t("title")}</h1>
				<p className="text-sm text-muted-foreground">{t("description")}</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>{t("seed.title")}</CardTitle>
					<CardDescription>{t("seed.description")}</CardDescription>
				</CardHeader>
				<CardContent className="flex gap-3">
					<Button
						onClick={() => seedMockHouse()}
						disabled={isSeeding || isClearing}
					>
						{isSeeding ? <Loader2 className="animate-spin" /> : <Sparkles />}
						{t("seed.action")}
					</Button>
					<Button
						variant="destructive"
						onClick={() => clearMockHouse()}
						disabled={isSeeding || isClearing}
					>
						{isClearing ? <Loader2 className="animate-spin" /> : <Trash2 />}
						{t("seed.clearAction")}
					</Button>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("telemetry.title")}</CardTitle>
					<CardDescription>{t("telemetry.description")}</CardDescription>
				</CardHeader>
				<CardContent>
					<form
						noValidate
						onSubmit={telemetryForm.handleSubmit(onEmitTelemetry)}
						className="space-y-4"
					>
						<FormSelect
							id="telemetry-device"
							name="deviceId"
							control={telemetryForm.control}
							label={t("telemetry.fields.device")}
							icon={<Radio className="h-4 w-4" />}
							options={deviceOptions}
							error={telemetryForm.formState.errors.deviceId?.message}
						/>
						<div className="grid grid-cols-2 gap-3">
							<FormInput
								id="telemetry-watts"
								type="number"
								label={t("telemetry.fields.watts")}
								icon={<Zap className="h-4 w-4" />}
								registration={telemetryForm.register("powerUsageWatts")}
								error={telemetryForm.formState.errors.powerUsageWatts?.message}
							/>
							<FormInput
								id="telemetry-temperature"
								type="number"
								label={t("telemetry.fields.temperature")}
								icon={<Thermometer className="h-4 w-4" />}
								registration={telemetryForm.register("temperatureCelsius")}
								error={
									telemetryForm.formState.errors.temperatureCelsius?.message
								}
							/>
						</div>
						<Button type="submit" disabled={isEmitting}>
							{isEmitting && <Loader2 className="animate-spin" />}
							{t("telemetry.action")}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t("connectivity.title")}</CardTitle>
					<CardDescription>{t("connectivity.description")}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<FormSelect
						id="connectivity-device"
						name="deviceId"
						control={connectivityForm.control}
						label={t("connectivity.fields.device")}
						icon={<WifiOff className="h-4 w-4" />}
						options={deviceOptions}
						error={connectivityForm.formState.errors.deviceId?.message}
					/>
					<div className="flex gap-3">
						<Button
							variant="secondary"
							disabled={isToggling}
							onClick={() => onToggleConnectivity(true)}
						>
							{t("connectivity.online")}
						</Button>
						<Button
							variant="destructive"
							disabled={isToggling}
							onClick={() => onToggleConnectivity(false)}
						>
							{t("connectivity.offline")}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};
