import { Shield, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Placeholder visual — não há integração real de vídeo/detecção de movimento
 * no backend ainda (só o tipo de dispositivo Camera existe, sem stream nem
 * IA). Card ilustrativo até essa feature ser implementada no backend.
 */
export function CameraFeedCard() {
	const { t } = useTranslation("dashboard");

	return (
		<div className="overflow-hidden rounded-xl border border-border-subtle bg-surface-container transition-all duration-200 hover:border-border">
			<div className="flex items-center gap-2 border-b border-border-subtle px-4 py-2.5">
				<Shield className="h-3.5 w-3.5 text-destructive" />
				<span className="text-xs font-semibold tracking-wide text-foreground">
					{t("cameraFeed.title", "Aether Secure")}
				</span>
			</div>

			<div className="relative aspect-video overflow-hidden bg-surface-low grayscale">
				<div
					className="absolute inset-0 opacity-30 pointer-events-none"
					style={{
						backgroundImage:
							"repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)",
					}}
				/>
				<div className="absolute inset-0 flex items-center justify-center text-muted-foreground/30">
					<Video className="h-9 w-9" />
				</div>
				<div className="absolute left-2.5 top-2.5 flex items-center gap-1.5 rounded bg-black/70 px-2 py-0.5 backdrop-blur-xs">
					<span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
					<span className="font-mono text-[10px] font-bold tracking-widest text-white">
						{t("cameraFeed.liveLabel", "LIVE")}
					</span>
				</div>
			</div>

			<div className="p-4">
				<p className="text-xs text-muted-foreground">
					{t(
						"cameraFeed.comingSoon",
						"Integração de câmeras chegando em breve.",
					)}
				</p>
			</div>
		</div>
	);
}
