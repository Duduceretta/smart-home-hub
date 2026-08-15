import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en-US/common.json";
import enDevices from "./locales/en-US/devices.json";
import ptCommon from "./locales/pt-BR/common.json";
import ptDevices from "./locales/pt-BR/devices.json";

export const defaultNS = "common";

export const resources = {
	"pt-BR": {
		common: ptCommon,
		devices: ptDevices,
	},
	"en-US": {
		common: enCommon,
		devices: enDevices,
	},
} as const;

i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources,
		fallbackLng: "pt-BR",
		defaultNS,
		ns: ["common", "devices"],
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
