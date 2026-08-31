import { z } from "zod";

export const historyEventSchema = z.object({
	id: z.string().uuid(),
	timestampUtc: z.string(),
	eventType: z.string(),
	description: z.string(),
	deviceId: z.string().uuid().nullable().optional(),
	deviceName: z.string().nullable().optional(),
	roomId: z.string().uuid().nullable().optional(),
	roomName: z.string().nullable().optional(),
	deviceGroupId: z.string().uuid().nullable().optional(),
	deviceGroupName: z.string().nullable().optional(),
	source: z.string(),
	severity: z.string(),
	oldValue: z.string().nullable().optional(),
	newValue: z.string().nullable().optional(),
});

export const getHistoryParamsSchema = z.object({
	startDateUtc: z.string(),
	endDateUtc: z.string(),
	deviceId: z.string().uuid().optional(),
	roomId: z.string().uuid().optional(),
	deviceGroupId: z.string().uuid().optional(),
	severity: z.union([z.number(), z.string()]).optional(),
	source: z.union([z.number(), z.string()]).optional(),
	search: z.string().optional(),
	page: z.number().int().positive().optional(),
	pageSize: z.number().int().positive().max(100).optional(),
});
