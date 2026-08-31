import { useMutation } from "@tanstack/react-query";
import { syncUserWithBackendRequest } from "../api/auth.api";
import type { SyncUserResponse } from "../types/auth.types";

export function useSyncUser() {
	return useMutation<SyncUserResponse, Error, void>({
		mutationFn: syncUserWithBackendRequest,
	});
}
