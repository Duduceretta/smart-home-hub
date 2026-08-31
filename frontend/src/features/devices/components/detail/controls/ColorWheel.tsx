import { useRef, useState } from "react";
import { hsvToHex } from "../../../lib/hsv-to-hex";

interface ColorWheelProps {
	size?: number;
	disabled?: boolean;
	onCommit: (hex: string) => void;
}

const DEFAULT_SIZE = 168;

/**
 * Roda de cores circular arrastável (matiz = ângulo, saturação = raio),
 * mesmo padrão visual do app Smart Life — substitui a fileira de swatches +
 * `<input type="color">` nativo. V (brilho) fica fixo em 100% aqui de
 * propósito: quem controla o brilho de verdade é o slider de Brilho já
 * existente no painel (que agora sabe escrever no componente V do DP de cor
 * quando o dispositivo está em modo colorido — ver TuyaLocalControlService
 * no backend), exatamente como o Smart Life separa a roda de cor do
 * controle de brilho.
 *
 * Commit-on-release: arrastar só atualiza a posição visual do thumb local;
 * a chamada de rede (`onCommit`) dispara uma vez no `onPointerUp`.
 */
export function ColorWheel({
	size = DEFAULT_SIZE,
	disabled,
	onCommit,
}: ColorWheelProps) {
	const wheelRef = useRef<HTMLDivElement>(null);
	const [hue, setHue] = useState(0);
	const [saturation, setSaturation] = useState(1);
	const [isDragging, setIsDragging] = useState(false);

	const radius = size / 2;

	const updateFromPointer = (clientX: number, clientY: number) => {
		const rect = wheelRef.current?.getBoundingClientRect();
		if (!rect) return;

		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const dx = clientX - centerX;
		const dy = clientY - centerY;

		const distance = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
		const nextSaturation = distance / radius;

		// Ângulo consistente com `conic-gradient(from 0deg, ...)` do CSS
		// abaixo: 0deg aponta pra cima e cresce no sentido horário — daí
		// atan2(dx, -dy) em vez do atan2(dy, dx) trigonométrico padrão.
		const angleRad = Math.atan2(dx, -dy);
		const nextHue = ((angleRad * 180) / Math.PI + 360) % 360;

		setHue(nextHue);
		setSaturation(nextSaturation);
	};

	const commit = () => {
		onCommit(hsvToHex(hue, saturation, 1));
	};

	const thumbAngleRad = (hue * Math.PI) / 180;
	const thumbDistance = saturation * radius;
	const thumbX = radius + thumbDistance * Math.sin(thumbAngleRad);
	const thumbY = radius - thumbDistance * Math.cos(thumbAngleRad);

	return (
		<div
			ref={wheelRef}
			role="slider"
			aria-label="Cor"
			aria-disabled={disabled}
			aria-valuenow={Math.round(hue)}
			aria-valuemin={0}
			aria-valuemax={360}
			tabIndex={disabled ? -1 : 0}
			className="relative shrink-0 touch-none rounded-full shadow-inner"
			style={{
				width: size,
				height: size,
				background:
					"radial-gradient(circle at center, #fff 0%, rgba(255,255,255,0) 70%), conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
				cursor: disabled ? "not-allowed" : "pointer",
				opacity: disabled ? 0.5 : 1,
			}}
			onPointerDown={(e) => {
				if (disabled) return;
				e.currentTarget.setPointerCapture(e.pointerId);
				setIsDragging(true);
				updateFromPointer(e.clientX, e.clientY);
			}}
			onPointerMove={(e) => {
				if (disabled || e.buttons !== 1 || !isDragging) return;
				updateFromPointer(e.clientX, e.clientY);
			}}
			onPointerUp={(e) => {
				if (e.currentTarget.hasPointerCapture(e.pointerId)) {
					e.currentTarget.releasePointerCapture(e.pointerId);
				}
				if (disabled) return;
				setIsDragging(false);
				commit();
			}}
		>
			<div
				className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
				style={{
					left: thumbX,
					top: thumbY,
					backgroundColor: hsvToHex(hue, saturation, 1),
				}}
			/>
		</div>
	);
}
