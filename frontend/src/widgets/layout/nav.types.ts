import type { LucideIcon } from "lucide-react";
import {
	Bot,
	DoorOpen,
	History,
	Home,
	Layers,
	LayoutDashboard,
	Router,
	Settings,
} from "lucide-react";

export interface NavItem {
	id: string;
	name: string;
	path: string;
	icon: LucideIcon;
	badge?: string | number;
	disabled?: boolean;
}

export interface NavSection {
	id: string;
	title?: string;
	items: NavItem[];
}

/**
 * Contrato de domínio para preparação arquitetural de múltiplos hubs.
 * Pronto para suportar seletor funcional futuro sem quebrar o layout.
 */
export interface HubInfo {
	id: string;
	name: string;
	isOnline: boolean;
	role: "primary" | "secondary";
	host?: string;
	deviceCount?: number;
}

export const NAV_SECTIONS: NavSection[] = [
	{
		id: "main",
		title: "Principal",
		items: [
			{
				id: "home",
				name: "Início",
				path: "/home",
				icon: Home,
			},
			{
				id: "dashboard",
				name: "Dashboard",
				path: "/dashboard",
				icon: LayoutDashboard,
			},
			{
				id: "devices",
				name: "Dispositivos",
				path: "/devices",
				icon: Router,
			},
			{
				id: "rooms",
				name: "Ambientes",
				path: "/rooms",
				icon: DoorOpen,
			},
			{
				id: "groups",
				name: "Grupos",
				path: "/device-groups",
				icon: Layers,
			},
		],
	},
	{
		id: "automation",
		title: "Automação",
		items: [
			{
				id: "automations",
				name: "Automações",
				path: "/automations",
				icon: Bot,
			},
			{
				id: "history",
				name: "Histórico",
				path: "/history",
				icon: History,
			},
		],
	},
	{
		id: "system",
		title: "Sistema",
		items: [
			{
				id: "settings",
				name: "Configurações",
				path: "/settings",
				icon: Settings,
			},
		],
	},
];

/**
 * Validação estrita de rota ativa para evitar falsos positivos
 * (ex: "/device-groups" contém a substring "/devices", mas são rotas distintas).
 */
export function isRouteActive(
	currentPath: string,
	targetPath: string,
): boolean {
	if (targetPath === "/home") {
		return currentPath === "/home" || currentPath === "/";
	}
	if (targetPath === "/dashboard") {
		return currentPath === "/dashboard";
	}
	return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}
