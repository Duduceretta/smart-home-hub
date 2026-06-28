import { Button } from "@/presentation/components/ui/button";

export function App() {
	return (
		<div className="flex min-h-screen flex-col gap-4 items-center justify-center bg-zinc-950 text-zinc-50">
			<h1 className="text-3xl font-bold tracking-tight">Smart Home Hub</h1>
			<Button variant="default">Ligar Luz da Sala</Button>
		</div>
	);
}
