import { HttpResponse, http } from "msw";

export const handlers = [
	// Intercepta a alternância de estado de dispositivo (Toggle via POST)
	http.post("*/api/devices/:id/toggle", async ({ params }) => {
		const { id } = params;

		return HttpResponse.json(
			{
				id,
				isOn: true,
				updatedAt: new Date().toISOString(),
			},
			{ status: 200 },
		);
	}),

	// Intercepta a exclusão de dispositivo
	http.delete("*/api/devices/:id", async () => {
		return new HttpResponse(null, { status: 204 });
	}),

	// Intercepta a listagem geral de dispositivos
	http.get("*/api/devices", () => {
		return HttpResponse.json([], { status: 200 });
	}),
];
