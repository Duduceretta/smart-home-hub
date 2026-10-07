import { HttpResponse, http } from "msw";
import type { Scene, SceneDevice } from "@/features/scenes/types/scenes.types";
import { server } from "./server";

const NO_ROOM = "Sem cômodo";

/** Sem caixa e sem acento, como o `unaccent(lower(...))` do servidor. */
const normalize = (text: string) =>
	text
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();

/**
 * Espelha o contrato real de `GET /api/scenes`, `GET /api/scenes/rooms` e
 * `GET /api/scenes/{id}` (backend NH-63): `search` casa nome da cena ou de qualquer
 * dispositivo dela, `room` casa o ambiente de algum dispositivo ("Sem cômodo" para
 * dispositivo sem ambiente), a ordem é por nome e a paginação vale sobre o conjunto
 * filtrado (`pageSize` no máximo 100). Devolve as requisições recebidas para os testes
 * conferirem o que a tela pediu.
 */
export function mockScenesApi(scenes: Scene[], devices: SceneDevice[] = []) {
	const requests: URL[] = [];
	const roomOf = (deviceId: string) =>
		devices.find((device) => device.id === deviceId)?.room?.trim() || NO_ROOM;
	const ordered = [...scenes].sort((a, b) => a.name.localeCompare(b.name));

	server.use(
		http.get("*/api/scenes/rooms", () =>
			HttpResponse.json(
				[
					...new Set(
						scenes.flatMap((scene) =>
							scene.items.map((item) => roomOf(item.deviceId)),
						),
					),
				].sort((a, b) => a.localeCompare(b)),
			),
		),
		http.get("*/api/scenes/:id", ({ params }) => {
			const scene = scenes.find((entry) => entry.id === params.id);

			return scene
				? HttpResponse.json(scene)
				: HttpResponse.json(
						{ title: "Not found", status: 404 },
						{ status: 404 },
					);
		}),
		http.get("*/api/scenes", ({ request }) => {
			const url = new URL(request.url);
			requests.push(url);

			const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
			const pageSize = Math.min(
				100,
				Math.max(1, Number(url.searchParams.get("pageSize") ?? 10)),
			);
			const search = normalize(url.searchParams.get("search")?.trim() ?? "");
			const room = url.searchParams.get("room")?.trim() ?? "";

			const filtered = ordered.filter((scene) => {
				if (room && !scene.items.some((item) => roomOf(item.deviceId) === room))
					return false;
				if (!search) return true;

				return (
					normalize(scene.name).includes(search) ||
					scene.items.some((item) =>
						normalize(item.deviceName).includes(search),
					)
				);
			});

			const totalPages = Math.ceil(filtered.length / pageSize);

			return HttpResponse.json({
				items: filtered.slice((page - 1) * pageSize, page * pageSize),
				page,
				pageSize,
				totalCount: filtered.length,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1,
			});
		}),
	);

	return { requests };
}
