import { Loader2, Music2, Unplug } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { useConnectSpotify } from "../hooks/useConnectSpotify";
import { useDisconnectSpotify } from "../hooks/useDisconnectSpotify";
import { useSpotifyStatus } from "../hooks/useSpotifyStatus";

export const SpotifyConnectCard: React.FC = () => {
	const { t } = useTranslation("integrations");
	const [searchParams, setSearchParams] = useSearchParams();
	const { data: status, isLoading } = useSpotifyStatus();
	const { mutate: connect, isPending: isConnecting } = useConnectSpotify();
	const { mutate: disconnect, isPending: isDisconnecting } =
		useDisconnectSpotify();

	// biome-ignore lint/correctness/useExhaustiveDependencies: só deve rodar uma vez, ao montar (lê o parâmetro inicial da URL pós-redirect).
	useEffect(() => {
		const result = searchParams.get("spotify");
		if (!result) return;

		if (result === "connected") {
			toast.success(t("spotify.connectCard.connectedToast"));
		} else if (result === "error") {
			toast.error(t("spotify.connectCard.connectRedirectErrorToast"));
		}

		const next = new URLSearchParams(searchParams);
		next.delete("spotify");
		setSearchParams(next, { replace: true });
	}, []);

	return (
		<div className="rounded-xl border border-border-subtle bg-surface-low p-4 transition-all duration-200 hover:border-border">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3.5 min-w-0">
					{/* design-token-lint-ignore: verde oficial da marca Spotify, identidade visual de terceiro */}
					<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
						<Music2 className="h-5 w-5" />
					</span>
					<div className="flex min-w-0 flex-1 flex-col">
						<span className="text-sm font-medium text-foreground">Spotify</span>
						<span className="truncate text-xs text-muted-foreground">
							{isLoading
								? t("spotify.connectCard.checkingConnection")
								: status?.connected
									? t("spotify.connectCard.connectedAs", {
											name: status.displayName,
										})
									: t("spotify.connectCard.trackingHint")}
						</span>
					</div>
				</div>

				{status?.connected ? (
					<Button
						type="button"
						variant="outline"
						disabled={isDisconnecting}
						onClick={() => disconnect()}
						className="h-11 sm:h-9 w-full sm:w-auto border-border-subtle bg-surface-container/60 text-xs font-medium text-destructive transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer justify-center"
					>
						{isDisconnecting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Unplug className="h-4 w-4" />
						)}
						{t("spotify.connectCard.disconnectButton")}
					</Button>
				) : (
					<Button
						type="button"
						disabled={isConnecting}
						onClick={() => connect()}
						// design-token-lint-ignore: verde oficial da marca Spotify, identidade visual de terceiro
						className="h-11 sm:h-9 w-full sm:w-auto bg-[#1DB954] text-xs font-semibold text-black shadow-xs transition-colors hover:bg-[#1ed760] cursor-pointer justify-center"
					>
						{isConnecting ? (
							<Loader2 className="h-4 w-4 animate-spin mr-1" />
						) : null}
						{t("spotify.connectCard.connectButton")}
					</Button>
				)}
			</div>
		</div>
	);
};
