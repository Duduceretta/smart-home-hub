import "i18next";
import type { defaultNS, resources } from "./index";
import type ptDev from "./locales/pt-BR/dev.json";

declare module "i18next" {
	interface CustomTypeOptions {
		defaultNS: typeof defaultNS;
		resources: (typeof resources)["pt-BR"] & { dev: typeof ptDev };
	}
}
