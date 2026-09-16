import { HttpResponse, http } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { DeviceTypeEnum } from "@/features/devices/types/devices.types";
import { createDashboardOverviewMock } from "@/testing/mocks/dashboard.mock";
import { createDeviceMock } from "@/testing/mocks/device.mock";
import { server } from "@/testing/mocks/server";
import {
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
} from "@/testing/test-utils";
import { HomeActivityFeed } from "../components/HomeActivityFeed";
import { HomeAlertBanner } from "../components/HomeAlertBanner";
import { HomeDeviceCard } from "../components/HomeDeviceCard";
import { HomeDeviceGrid } from "../components/HomeDeviceGrid";
import { HomeHeader } from "../components/HomeHeader";
import { HomeQuickActions } from "../components/HomeQuickActions";
import { HomeView } from "../HomeView";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
	const actual = await vi.importActual("react-router-dom");
	return {
		...actual,
		useNavigate: () => mockNavigate,
	};
});

const lamp = createDeviceMock({
	id: "dev-lamp-1",
	name: "Lâmpada Inteligente",
	type: DeviceTypeEnum.Light,
	room: "Sala de Estar",
	roomId: "room-1",
	isOnline: true,
	isOn: true,
	brightness: 75,
});

const sensor = createDeviceMock({
	id: "dev-sensor-1",
	name: "Sensor de Movimento",
	type: DeviceTypeEnum.Sensor,
	room: "Corredor",
	roomId: "room-2",
	isOnline: true,
	isOn: false,
});

const offlineSwitch = createDeviceMock({
	id: "dev-switch-1",
	name: "Interruptor Jardim",
	type: DeviceTypeEnum.Switch,
	room: "Externo",
	roomId: "room-3",
	isOnline: false,
	isOn: false,
});

describe("Home Page Components", () => {
	describe("HomeHeader", () => {
		it("HomeHeader_SingleProject_ShouldRenderStaticH1WithoutDropdown", () => {
			renderWithProviders(
				<MemoryRouter>
					<HomeHeader
						activeDevicesCount={3}
						initialProjects={[
							{ id: "default", name: "Nexus Hub", isPrimary: true },
						]}
					/>
				</MemoryRouter>,
			);

			// Deve renderizar h1 direto com o nome do projeto
			const heading = screen.getByRole("heading", { level: 1 });
			expect(heading).toHaveTextContent("Nexus Hub");

			// Não deve haver botão de alternar residência
			expect(
				screen.queryByRole("button", { name: /alternar residência/i }),
			).not.toBeInTheDocument();

			// Deve renderizar o status Online e a contagem de ativos
			expect(screen.getByText("Online")).toBeInTheDocument();
			expect(screen.getByText("3 ativos")).toBeInTheDocument();
		});

		it("HomeHeader_MultipleProjects_ShouldRenderDropdownSwitcher", async () => {
			const user = userEvent.setup();
			renderWithProviders(
				<MemoryRouter>
					<HomeHeader
						activeDevicesCount={1}
						initialProjects={[
							{ id: "p1", name: "Casa Principal", isPrimary: true },
							{ id: "p2", name: "Casa de Praia", isPrimary: false },
						]}
					/>
				</MemoryRouter>,
			);

			// Deve renderizar botão do switcher
			const switcher = screen.getByRole("button", {
				name: /alternar residência/i,
			});
			expect(switcher).toBeInTheDocument();
			expect(switcher).toHaveTextContent("Casa Principal");

			// Ao clicar, abre o menu com as opções
			await user.click(switcher);
			expect(screen.getByText("Casa de Praia")).toBeInTheDocument();
			expect(screen.getByText(/adicionar residência/i)).toBeInTheDocument();
		});
	});

	describe("HomeAlertBanner", () => {
		it("HomeAlertBanner_ZeroAlerts_ShouldReturnNull", () => {
			const { container } = renderWithProviders(
				<MemoryRouter>
					<HomeAlertBanner activeAlertsCount={0} />
				</MemoryRouter>,
			);
			expect(container.firstChild).toBeNull();
		});

		it("HomeAlertBanner_ActiveAlerts_ShouldRenderProminentAlertAndNavigate", async () => {
			const user = userEvent.setup();
			mockNavigate.mockClear();

			renderWithProviders(
				<MemoryRouter>
					<HomeAlertBanner activeAlertsCount={2} />
				</MemoryRouter>,
			);

			expect(screen.getByRole("alert")).toBeInTheDocument();
			expect(screen.getByText(/2 alertas ativos/i)).toBeInTheDocument();

			const detailsButton = screen.getByRole("button", {
				name: /ver detalhes/i,
			});
			await user.click(detailsButton);
			expect(mockNavigate).toHaveBeenCalledWith("/history");
		});
	});

	describe("HomeQuickActions", () => {
		it("HomeQuickActions_DefaultScenes_ShouldRenderTactileSceneButtons", () => {
			renderWithProviders(
				<MemoryRouter>
					<HomeQuickActions />
				</MemoryRouter>,
			);

			expect(screen.getByText("Cenas & Ações Rápidas")).toBeInTheDocument();
			expect(screen.getByText("Modo Cinema")).toBeInTheDocument();
			expect(screen.getByText("Bom Dia")).toBeInTheDocument();

			const exploreLinks = screen.getAllByRole("link", {
				name: /ver automações/i,
			});
			expect(exploreLinks.length).toBeGreaterThan(0);
			expect(exploreLinks[0]).toHaveAttribute("href", "/automations");
		});

		it("HomeQuickActions_WithScenes_ShouldRenderSceneButtons", async () => {
			const onTrigger = vi.fn();
			renderWithProviders(
				<MemoryRouter>
					<HomeQuickActions
						scenes={[
							{
								id: "s1",
								name: "Cinema Noturno",
								isActive: false,
								onTrigger,
							},
						]}
					/>
				</MemoryRouter>,
			);

			const button = screen.getByRole("button", { name: /cinema noturno/i });
			expect(button).toBeInTheDocument();
			fireEvent.click(button);
			expect(onTrigger).toHaveBeenCalledTimes(1);
		});
	});

	describe("HomeDeviceCard", () => {
		it("HomeDeviceCard_ActuatorDevice_ShouldRenderDetailsAndHandleToggle", async () => {
			renderWithProviders(
				<MemoryRouter>
					<HomeDeviceCard device={lamp} />
				</MemoryRouter>,
			);

			expect(screen.getByText("Lâmpada Inteligente")).toBeInTheDocument();
			expect(screen.getByText("Sala de Estar")).toBeInTheDocument();
			expect(screen.getByText("LIGADO • 75%")).toBeInTheDocument();

			const switchToggle = screen.getByRole("switch");
			expect(switchToggle).toBeInTheDocument();
			expect(switchToggle).toHaveAttribute("aria-checked", "true");
		});

		it("HomeDeviceCard_ClickOutsideToggle_ShouldTriggerDashboardFallback", async () => {
			mockNavigate.mockClear();
			renderWithProviders(
				<MemoryRouter>
					<HomeDeviceCard device={sensor} />
				</MemoryRouter>,
			);

			// Sensor não deve renderizar toggle switch
			expect(screen.queryByRole("switch")).not.toBeInTheDocument();
			expect(screen.getByText("MONITORANDO")).toBeInTheDocument();

			// Clicar no card deve navegar para /dashboard
			const card = screen.getByRole("button");
			fireEvent.click(card);
			expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
		});
	});

	describe("HomeDeviceGrid", () => {
		it("HomeDeviceGrid_SortingAndFiltering_ShouldFilterActiveDevices", async () => {
			const user = userEvent.setup();
			renderWithProviders(
				<MemoryRouter>
					<HomeDeviceGrid
						devices={[lamp, sensor, offlineSwitch]}
						isLoading={false}
						isError={false}
						onRetry={() => {}}
					/>
				</MemoryRouter>,
			);

			// Inicialmente exibe todos os 3
			expect(screen.getByText("Lâmpada Inteligente")).toBeInTheDocument();
			expect(screen.getByText("Sensor de Movimento")).toBeInTheDocument();
			expect(screen.getByText("Interruptor Jardim")).toBeInTheDocument();

			// Clica no filtro de ligados
			const activeFilterBtn = screen.getByRole("button", {
				name: /ligados/i,
			});
			await user.click(activeFilterBtn);

			// Agora só deve exibir o ligado (lamp)
			expect(screen.getByText("Lâmpada Inteligente")).toBeInTheDocument();
			expect(screen.queryByText("Sensor de Movimento")).not.toBeInTheDocument();
			expect(screen.queryByText("Interruptor Jardim")).not.toBeInTheDocument();
		});
	});

	describe("HomeActivityFeed", () => {
		it("HomeActivityFeed_ShouldRenderEventEntriesAndLinkToHistory", () => {
			renderWithProviders(
				<MemoryRouter>
					<HomeActivityFeed
						entries={[
							{
								id: "act-1",
								title: "Automação acionada",
								description: "Luzes externas ligadas ao pôr do sol",
								timestamp: new Date().toISOString(),
								isAlert: false,
								deviceId: null,
								eventType: "AutomationExecuted",
							},
						]}
					/>
				</MemoryRouter>,
			);

			expect(screen.getByText("Automação acionada")).toBeInTheDocument();
			expect(
				screen.getByText("Luzes externas ligadas ao pôr do sol"),
			).toBeInTheDocument();

			const viewAllLink = screen.getByRole("link", { name: /ver tudo/i });
			expect(viewAllLink).toHaveAttribute("href", "/history");
		});
	});

	describe("HomeView Full Integration", () => {
		it("HomeView_Integration_ShouldFetchAndRenderCompleteHomeScreen", async () => {
			server.use(
				http.get("http://localhost:5252/api/devices", () => {
					return HttpResponse.json({
						items: [lamp, sensor],
						page: 1,
						pageSize: 200,
						totalCount: 2,
						totalPages: 1,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
				http.get("http://localhost:5252/api/dashboard/overview", () => {
					return HttpResponse.json(
						createDashboardOverviewMock({
							summary: {
								onlineDevicesCount: 2,
								totalDevicesCount: 2,
								energyConsumptionKwh: 45,
								isEnergyEstimated: false,
								averageTemperatureCelsius: 22.0,
								temperatureTrend: 0,
								activeAlertsCount: 0,
							},
						}),
					);
				}),
				http.get("http://localhost:5252/api/history/activity-log", () => {
					return HttpResponse.json({
						items: [],
						page: 1,
						pageSize: 5,
						totalCount: 0,
						totalPages: 1,
						hasNextPage: false,
						hasPreviousPage: false,
					});
				}),
			);

			renderWithProviders(
				<MemoryRouter initialEntries={["/home"]}>
					<HomeView />
				</MemoryRouter>,
			);

			// Aguarda carregar os dispositivos
			await waitFor(() => {
				expect(screen.getByText("Lâmpada Inteligente")).toBeInTheDocument();
			});

			expect(screen.getByText("Nexus Hub")).toBeInTheDocument();
			expect(screen.getByText("Modo Cinema")).toBeInTheDocument();
			expect(screen.getByText("Rede Residencial Ativa")).toBeInTheDocument();
			expect(screen.getByText("Segurança & Alarme")).toBeInTheDocument();
		});
	});
});
