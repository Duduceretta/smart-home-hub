import { Loader2, Music2, Unplug } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/core/components/ui/button";
import { useConnectSpotify } from "../hooks/useConnectSpotify";
import { useDisconnectSpotify } from "../hooks/useDisconnectSpotify";
import { useSpotifyStatus } from "../hooks/useSpotifyStatus";

export const SpotifyConnectCard: React.FC = () => {
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
			toast.success("Conta do Spotify conectada com sucesso!");
		} else if (result === "error") {
			toast.error(
				"Não foi possível conectar sua conta do Spotify. Tente novamente.",
			);
		}

		const next = new URLSearchParams(searchParams);
		next.delete("spotify");
		setSearchParams(next, { replace: true });
	}, []);

	return (
		<div className="rounded-xl border border-border-subtle bg-surface-container p-4 transition-all duration-200 hover:border-border">
			<div className="flex items-center gap-4">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
					<Music2 className="h-5 w-5" />
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-sm font-semibold text-foreground">Spotify</span>
					<span className="truncate text-xs text-muted-foreground">
						{isLoading
							? "Verificando conexão..."
							: status?.connected
								? `Conectado como ${status.displayName}`
								: "Acompanhe o que está tocando em tempo real."}
					</span>
				</div>

				{status?.connected ? (
					<Button
						type="button"
						variant="outline"
						disabled={isDisconnecting}
						onClick={() => disconnect()}
						className="border-border-subtle bg-surface-low/50 text-xs font-medium text-destructive transition-all hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive cursor-pointer"
					>
						{isDisconnecting ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Unplug className="h-4 w-4" />
						)}
						Desconectar
					</Button>
				) : (
					<Button
						type="button"
						disabled={isConnecting}
						onClick={() => connect()}
						className="bg-[#1DB954] text-xs font-bold text-black shadow-xs transition-colors hover:bg-[#1ed760] cursor-pointer"
					>
						{isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						Conectar Spotify
					</Button>
				)}
			</div>
		</div>
	);
};
