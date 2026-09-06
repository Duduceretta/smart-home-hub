import { Cast, Cloud, Cpu, Radar, Radio, Router, Tv, Zap } from "lucide-react";
import type { ComponentType } from "react";
import { DEVICE_CONFIG } from "@/core/constants/device-config";
import { IntegrationTypeEnum } from "../types/devices.types";

export { DEVICE_CONFIG };

export const DEVICE_CATEGORIES = [
	"Todos",
	"Iluminação",
	"Climatização",
	"Segurança",
	"Eletrodomésticos",
] as const;

export type DeviceCategory = (typeof DEVICE_CATEGORIES)[number];

/**
 * Maps each category filter value (also used as the API's `category` query
 * param, kept stable across locales) to its i18n key under the `devices`
 * namespace's `categories` object, for translated display labels.
 */
export const CATEGORY_LABEL_KEYS = {
	Todos: "categories.all",
	Iluminação: "categories.lighting",
	Climatização: "categories.climate",
	Segurança: "categories.security",
	Eletrodomésticos: "categories.appliances",
} as const satisfies Record<DeviceCategory, string>;

export const INTEGRATION_ICON: Record<
	IntegrationTypeEnum,
	ComponentType<{ className?: string }>
> = {
	[IntegrationTypeEnum.NativeMqtt]: Radio,
	[IntegrationTypeEnum.TuyaBridge]: Cloud,
	[IntegrationTypeEnum.LgWebOs]: Tv,
	[IntegrationTypeEnum.GoogleCast]: Cast,
	[IntegrationTypeEnum.Zigbee]: Zap,
	[IntegrationTypeEnum.MdnsZeroconf]: Radar,
	[IntegrationTypeEnum.SsdpUpnp]: Router,
	[IntegrationTypeEnum.TuyaLocal]: Cloud,
	[IntegrationTypeEnum.EspHomeMqtt]: Cpu,
	[IntegrationTypeEnum.AndroidTvAdb]: Tv,
};

export interface IntegrationFieldVisibility {
	showIp: boolean;
	showMac: boolean;
	showLocalKey: boolean;
	showProtocolVersion: boolean;
	showDpsPowerKey: boolean;
	showClientKey: boolean;
	/** Only enforced on create — the edit form treats every network field as optional. */
	requireIpOnCreate: boolean;
	requireLocalKeyOnCreate: boolean;
}

/**
 * Drives which network/configuration fields the Create/Edit device forms
 * show for each integration type, and which of those are required at
 * creation time (backend validators don't enforce this — it's frontend UX
 * guidance only, kept lenient on edit since blank fields there mean "keep
 * the current value", not "clear it").
 */
export const INTEGRATION_FIELD_VISIBILITY: Record<
	IntegrationTypeEnum,
	IntegrationFieldVisibility
> = {
	[IntegrationTypeEnum.NativeMqtt]: {
		showIp: true,
		showMac: true,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: false,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.TuyaBridge]: {
		showIp: true,
		showMac: false,
		showLocalKey: true,
		showProtocolVersion: false,
		showDpsPowerKey: true,
		showClientKey: false,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: true,
	},
	[IntegrationTypeEnum.LgWebOs]: {
		showIp: true,
		showMac: true,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.GoogleCast]: {
		showIp: true,
		showMac: true,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: true,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.Zigbee]: {
		showIp: false,
		showMac: false,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: false,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.MdnsZeroconf]: {
		showIp: true,
		showMac: false,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.SsdpUpnp]: {
		showIp: true,
		showMac: false,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.TuyaLocal]: {
		showIp: true,
		showMac: false,
		showLocalKey: true,
		showProtocolVersion: true,
		showDpsPowerKey: true,
		showClientKey: false,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: true,
	},
	[IntegrationTypeEnum.EspHomeMqtt]: {
		showIp: true,
		showMac: true,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: false,
		requireLocalKeyOnCreate: false,
	},
	[IntegrationTypeEnum.AndroidTvAdb]: {
		showIp: true,
		showMac: true,
		showLocalKey: false,
		showProtocolVersion: false,
		showDpsPowerKey: false,
		showClientKey: false,
		requireIpOnCreate: true,
		requireLocalKeyOnCreate: false,
	},
};
