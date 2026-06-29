import { Home } from "lucide-react";
import { useEffect, useState } from "react";
import { RegisterForm } from "../features/auth/components/RegisterForm";

export function RegisterPage() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		const t = setTimeout(() => setMounted(true), 100);
		return () => clearTimeout(t);
	}, []);

	return (
		<main className="flex h-screen w-full flex-col overflow-hidden bg-zinc-950 selection:bg-indigo-500/30 md:flex-row antialiased">
			<style>{`
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(12px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideInLeft {
                    from { opacity: 0; transform: translateX(-16px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position:  200% center; }
                }

                .animate-fade-up   { animation: fadeUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
                .animate-slide-left { animation: slideInLeft 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

                .delay-100 { animation-delay: 0.1s; }
                .delay-200 { animation-delay: 0.2s; }
                .delay-300 { animation-delay: 0.3s; }
                .delay-400 { animation-delay: 0.4s; }
                .delay-500 { animation-delay: 0.5s; }
                .delay-600 { animation-delay: 0.6s; }
                .delay-700 { animation-delay: 0.7s; }

                .opacity-0-init { opacity: 0; }

                .shimmer-line {
                    background: linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 50%, transparent 100%);
                    background-size: 200% 100%;
                    animation: shimmer 3s ease infinite;
                }

                .input-field { transition: border-color 0.3s ease, box-shadow 0.3s ease; }
                .input-field:focus-within {
                    box-shadow: 0 0 0 1px rgba(99,102,241,0.4), 0 0 12px rgba(99,102,241,0.1);
                }

                .btn-primary { transition: all 0.2s ease; }
                .btn-primary:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 20px rgba(99,102,241,0.25);
                }
                .btn-primary:active { transform: translateY(0); }

                @media (prefers-reduced-motion: reduce) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `}</style>

			<section className="relative z-20 hidden h-full overflow-hidden border-r border-zinc-800/80 bg-zinc-950 shadow-[15px_0_50px_rgba(0,0,0,0.5)] md:flex md:w-1/2 lg:w-7/12">
				<div className="absolute inset-0 z-0">
					<img
						src="/bg-login.jpg"
						alt="Smart Home Environment"
						className="h-full w-full object-cover opacity-60"
						style={{
							transition: "opacity 1.5s ease",
							opacity: mounted ? 0.6 : 0,
						}}
					/>
					<div className="absolute inset-0 bg-linear-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
					<div className="absolute inset-0 bg-linear-to-r from-zinc-950/80 via-zinc-950/10 to-transparent" />
				</div>

				<div className="relative z-10 flex h-full w-full flex-col justify-between p-12">
					<div
						className={`opacity-0-init flex items-center gap-2 ${mounted ? "animate-slide-left" : ""}`}
					>
						<Home className="h-8 w-8 text-indigo-500" />
						<h1 className="text-2xl font-bold tracking-tight text-zinc-50">
							Smart Home Hub
						</h1>
					</div>

					<div
						className={`opacity-0-init ${mounted ? "animate-fade-up delay-400" : ""}`}
					>
						<div className="inline-flex items-center gap-2 rounded-full border border-zinc-800/80 bg-zinc-900/40 px-4 py-2 backdrop-blur-md">
							<span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
							<span className="text-xs font-medium text-zinc-300">
								Junte-se ao ecossistema
							</span>
						</div>
					</div>
				</div>
			</section>

			<section className="relative z-10 flex h-full w-full flex-col items-center justify-center bg-zinc-950 p-6 md:w-1/2 md:p-12 lg:w-5/12">
				<RegisterForm />
			</section>
		</main>
	);
}
