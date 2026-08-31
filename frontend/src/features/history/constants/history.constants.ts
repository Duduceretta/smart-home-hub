import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Cpu,
	Info,
	Layers,
	Music,
	Power,
	Radio,
	User,
	WifiOff,
	Zap,
} from "lucide-react";
import type { ElementType } from "react";

/**
 * Icons mapped to event sources.
 */
export const EVENT_SOURCE_ICON: Record<string, ElementType> = {
	Automation: Zap,
	UserManual: User,
	System: Cpu,
	DeviceGroup: Layers,
	Device: Radio,
	Default: Activity,
};

/**
 * Icons mapped to event types (EventType/SystemEventTypes), for the row's main
 * icon — coexists with EVENT_SOURCE_ICON, which stays on the origin badge.
 */
export const EVENT_TYPE_ICON: Record<string, ElementType> = {
	StateChange: Power,
	MediaPlayback: Music,
	DeviceOffline: WifiOff,
	DeviceOnline: Radio,
	Alert: AlertTriangle,
	AutomationTriggered: Zap,
	DeviceStatus: Power,
	DeviceMedia: Music,
	Spotify: Music,
	Default: Activity,
};

/**
 * Icons mapped to event severities.
 */
export const EVENT_SEVERITY_ICON: Record<string, ElementType> = {
	Info: Info,
	Warning: AlertTriangle,
	Error: AlertCircle,
	Critical: AlertCircle,
};

/**
 * Semantic style classes for event severities.
 * Uses only system design tokens (index.css).
 */
export const EVENT_SEVERITY_STYLES: Record<
	string,
	{ badge: string; text: string; dot: string }
> = {
	Info: {
		badge: "bg-surface-high text-muted-foreground border-border-subtle",
		text: "text-muted-foreground",
		dot: "bg-muted-foreground/70",
	},
	Warning: {
		badge: "bg-warm/10 text-warm border-warm/30",
		text: "text-warm",
		dot: "bg-warm",
	},
	Error: {
		badge:
			"bg-destructive/15 text-destructive-foreground border-destructive/30",
		text: "text-destructive",
		dot: "bg-destructive",
	},
	Critical: {
		badge: "bg-destructive/20 text-destructive border-destructive/50",
		text: "text-destructive",
		dot: "bg-destructive animate-ping",
	},
};

/**
 * Semantic styles for event sources.
 */
export const EVENT_SOURCE_STYLES: Record<
	string,
	{ badge: string; iconColor: string }
> = {
	Automation: {
		badge: "bg-primary/10 text-primary border-primary/20",
		iconColor: "text-primary",
	},
	DeviceGroup: {
		badge: "bg-warm/10 text-warm border-warm/20",
		iconColor: "text-warm",
	},
	UserManual: {
		badge: "bg-surface-high text-foreground border-border-subtle",
		iconColor: "text-foreground",
	},
	System: {
		badge: "bg-surface-high text-muted-foreground border-border-subtle",
		iconColor: "text-muted-foreground",
	},
};
