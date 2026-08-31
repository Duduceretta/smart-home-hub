import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enAuth from "./locales/en-US/auth.json";
import enAutomations from "./locales/en-US/automations.json";
import enCommon from "./locales/en-US/common.json";
import enDashboard from "./locales/en-US/dashboard.json";
import enDeviceGroups from "./locales/en-US/device-groups.json";
import enDevices from "./locales/en-US/devices.json";
import enHistory from "./locales/en-US/history.json";
import enRooms from "./locales/en-US/rooms.json";
import ptAuth from "./locales/pt-BR/auth.json";
import ptAutomations from "./locales/pt-BR/automations.json";
import ptCommon from "./locales/pt-BR/common.json";
import ptDashboard from "./locales/pt-BR/dashboard.json";
import ptDeviceGroups from "./locales/pt-BR/device-groups.json";
import ptDevices from "./locales/pt-BR/devices.json";
import ptHistory from "./locales/pt-BR/history.json";
import ptRooms from "./locales/pt-BR/rooms.json";

export const defaultNS = "common";

export const resources = {
	"pt-BR": {
		common: ptCommon,
		devices: ptDevices,
		dashboard: ptDashboard,
		rooms: ptRooms,
		"device-groups": ptDeviceGroups,
		auth: ptAuth,
		automations: ptAutomations,
		history: ptHistory,
	},
	"en-US": {
		common: enCommon,
		devices: enDevices,
		dashboard: enDashboard,
		rooms: enRooms,
		"device-groups": enDeviceGroups,
		auth: enAuth,
		automations: enAutomations,
		history: enHistory,
	},
} as const;

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "pt-BR",
		defaultNS,
		ns: [
			"common",
			"devices",
			"dashboard",
			"rooms",
			"device-groups",
			"auth",
			"automations",
			"history",
		],
		interpolation: {
			escapeValue: false,
		},
		detection: {
			order: ["localStorage", "navigator"],
			lookupLocalStorage: "smart_home_hub_lng",
			caches: ["localStorage"],
		},
	});

export default i18n;
