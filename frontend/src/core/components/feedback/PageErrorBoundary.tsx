import { AlertCircle, RotateCcw } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { useRouteError } from "react-router-dom";
import { Button } from "@/core/components/ui/button";
import { Logger } from "@/core/logger/app.logger";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

/**
 * Captura erros inesperados durante transições de rota ou carregamento de páginas dinâmicas,
 * prevenindo que a aplicação inteira crashe em tela branca.
 */
export class PageErrorBoundary extends Component<Props, State> {
	public override state: State = {
		hasError: false,
		error: null,
	};

	public static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		Logger.error("Erro capturado durante renderização de rota:", {
			error,
			componentStack: errorInfo.componentStack,
		});
	}

	private handleRetry = () => {
		this.setState({ hasError: false, error: null });
	};

	public override render() {
		if (this.state.hasError) {
			return (
				<div
					role="alert"
					className="flex flex-col items-center justify-center min-h-[360px] w-full p-8 text-center space-y-4"
				>
					<div className="h-12 w-12 rounded-full bg-alert/10 flex items-center justify-center text-alert">
						<AlertCircle className="h-6 w-6" />
					</div>
					<div className="space-y-1">
						<h2 className="text-lg font-semibold text-foreground">
							Ocorreu um erro ao carregar esta página
						</h2>
						<p className="text-sm text-muted-foreground max-w-md">
							Não foi possível renderizar a seção solicitada. Tente novamente ou
							navegue para outra página pelo menu lateral.
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						onClick={this.handleRetry}
						className="gap-2 cursor-pointer"
					>
						<RotateCcw className="h-4 w-4" />
						Tentar Novamente
					</Button>
				</div>
			);
		}

		return this.props.children;
	}
}

/**
 * Componente errorElement para o React Router pegar erros não tratados em nível de rota.
 */
export function RouteErrorBoundary() {
	const error = useRouteError();

	if (error) {
		Logger.error("Erro capturado no nível do roteador:", error);
	}

	return (
		<div
			role="alert"
			className="flex flex-col items-center justify-center min-h-[360px] w-full p-8 text-center space-y-4"
		>
			<div className="h-12 w-12 rounded-full bg-alert/10 flex items-center justify-center text-alert">
				<AlertCircle className="h-6 w-6" />
			</div>
			<div className="space-y-1">
				<h2 className="text-lg font-semibold text-foreground">
					Ocorreu um erro ao carregar esta rota
				</h2>
				<p className="text-sm text-muted-foreground max-w-md">
					Não foi possível resolver a página solicitada. Tente novamente ou
					navegue pelo menu.
				</p>
			</div>
			<Button
				variant="outline"
				size="sm"
				onClick={() => {
					window.location.href = "/dashboard";
				}}
				className="gap-2 cursor-pointer"
			>
				<RotateCcw className="h-4 w-4" />
				Ir para o Início
			</Button>
		</div>
	);
}
