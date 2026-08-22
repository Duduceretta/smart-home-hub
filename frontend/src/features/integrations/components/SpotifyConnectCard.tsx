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
		<div className="rounded-xl border border-[#46464b]/30 bg-linear-to-br from-[#2a2a2a] to-[#232323] p-4">
			<div className="flex items-center gap-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1DB954]/15 text-[#1DB954]">
					<Music2 className="h-5 w-5" />
				</span>
				<div className="flex flex-1 flex-col min-w-0">
					<span className="font-semibold text-[#e5e2e2] text-sm">Spotify</span>
					<span className="text-xs text-[#c7c6cb] truncate">
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
						className="border-[#46464b]/40 text-[#ffb4ab] hover:bg-[#93000a]/20"
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
						className="bg-[#1DB954] text-black hover:bg-[#1ed760]"
					>
						{isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
						Conectar Spotify
					</Button>
				)}
			</div>
		</div>
	);
};
