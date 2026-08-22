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
		<div className="rounded-xl border border-[#46464b]/20 bg-[#1c1b1c] overflow-hidden">
			<div className="flex items-center gap-2 px-4 py-3 border-b border-[#46464b]/20">
				<Shield className="w-3.5 h-3.5 text-[#ffb4ab]" />
				<span className="text-xs font-semibold text-[#e5e2e2]">
					{t("cameraFeed.title", "Aether Secure")}
				</span>
			</div>
			<div className="relative aspect-video bg-[#0a0a0a] grayscale overflow-hidden">
				<div
					className="absolute inset-0 opacity-30"
					style={{
						backgroundImage:
							"repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)",
					}}
				/>
				<div className="absolute inset-0 flex items-center justify-center text-white/15">
					<Video className="h-9 w-9" />
				</div>
				<div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded">
					<span className="h-1.5 w-1.5 rounded-full bg-[#ffb4ab] animate-pulse" />
					<span className="font-mono text-[8px] text-white font-bold tracking-widest">
						{t("cameraFeed.liveLabel", "LIVE")}
					</span>
				</div>
			</div>
			<div className="p-3">
				<p className="text-[10px] text-[#c7c6cb]/60">
					{t(
						"cameraFeed.comingSoon",
						"Integração de câmeras chegando em breve.",
					)}
				</p>
			</div>
		</div>
	);
}
