/**
 * Proteção contra falha de `react-remove-scroll` (utilizado internamente pelo Radix UI Dialog).
 * Em emuladores de toque e DevTools responsivo, toques prolongados (long press / hold) podem
 * emitir eventos Touch com `changedTouches` vazio ([]), fazendo o `getTouchXY` do `react-remove-scroll`
 * disparar `Cannot read properties of undefined (reading 'clientX')` e crashar a aplicação.
 */
if (typeof window !== "undefined") {
	const fallbackTouch = {
		clientX: 0,
		clientY: 0,
		pageX: 0,
		pageY: 0,
		screenX: 0,
		screenY: 0,
		identifier: 0,
		target: document.body,
	};

	const sanitizeTouchEvent = (e: Event) => {
		const touchEvent = e as TouchEvent;
		if (
			"changedTouches" in touchEvent &&
			(!touchEvent.changedTouches || touchEvent.changedTouches.length === 0)
		) {
			const fallback =
				touchEvent.touches && touchEvent.touches.length > 0
					? touchEvent.touches
					: ([fallbackTouch] as unknown as TouchList);
			try {
				Object.defineProperty(touchEvent, "changedTouches", {
					value: fallback,
					configurable: true,
				});
			} catch {
				// Ignora se o evento for congelado pelo runtime
			}
		}
	};

	window.addEventListener("touchstart", sanitizeTouchEvent, {
		capture: true,
		passive: true,
	});
	window.addEventListener("touchmove", sanitizeTouchEvent, {
		capture: true,
		passive: true,
	});
	window.addEventListener("touchend", sanitizeTouchEvent, {
		capture: true,
		passive: true,
	});
}

export {};
