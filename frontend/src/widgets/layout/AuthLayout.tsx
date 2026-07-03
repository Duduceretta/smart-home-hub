import { Home } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "@/core/utils";

interface AuthLayoutProps {
	children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setMounted(true), 100);
		return () => clearTimeout(t);
	}, []);

	return (
		<main className="flex min-h-screen w-full flex-col bg-zinc-950 selection:bg-indigo-500/30 md:flex-row antialiased">
			{/* LADO ESQUERDO (Fixo para todas as páginas de Auth) */}
			<section className="sticky top-0 z-20 hidden h-screen overflow-hidden border-r border-zinc-800/80 bg-zinc-950 shadow-[15px_0_50px_rgba(0,0,0,0.5)] md:flex md:w-1/2 lg:w-7/12">
				<div className="absolute inset-0 z-0">
					<img
						src="/bg-login.jpg"
						alt="Smart Home Environment"
						className="h-full w-full object-cover opacity-60 transition-opacity duration-1500 ease-in-out"
						style={{ opacity: mounted ? 0.6 : 0 }}
					/>
					<div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
					<div className="absolute inset-0 bg-linear-to-r from-zinc-950/80 via-zinc-950/10 to-transparent" />
				</div>

				<div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
					<div
						className={cn(
							"opacity-0-init flex items-center gap-2",
							mounted && "animate-slide-left",
						)}
					>
						<Home className="h-8 w-8 text-indigo-500" />
						<h1 className="text-2xl font-bold tracking-tight text-zinc-50">
							Smart Home Hub
						</h1>
					</div>

					<div
						className={cn(
							"opacity-0-init",
							mounted && "animate-fade-up delay-400",
						)}
					>
						<div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/40 px-4 py-2 backdrop-blur-md">
							<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
							<span className="text-xs font-medium text-zinc-300">
								Todos os sistemas operacionais
							</span>
						</div>
					</div>
				</div>
			</section>

			{/* LADO DIREITO (Dinâmico, recebe os formulários) */}
			<section className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center overflow-y-auto bg-zinc-950 p-6 py-12 md:w-1/2 md:p-12 lg:w-5/12">
				{children}
			</section>
		</main>
	);
}
