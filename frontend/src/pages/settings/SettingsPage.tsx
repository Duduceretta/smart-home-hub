import { SpotifyConnectCard } from "@/features/integrations/components/SpotifyConnectCard";
import { SpotifyNowPlayingCard } from "@/features/integrations/components/SpotifyNowPlayingCard";

export function SettingsPage() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-xl font-bold text-[#e5e2e2]">Configurações</h1>
				<p className="text-xs text-[#c7c6cb] mt-1">
					Gerencie integrações e preferências do seu hub.
				</p>
			</div>

			<section className="flex flex-col gap-3">
				<h2 className="text-xs font-semibold uppercase tracking-wider text-[#c7c6cb]">
					Integrações
				</h2>
				<SpotifyConnectCard />
				<SpotifyNowPlayingCard />
			</section>
		</div>
	);
}
