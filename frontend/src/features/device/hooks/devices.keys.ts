import type { StatusFilterType } from "../types/devices.types";

/**
 * Interface que tipa os filtros possíveis para que o TypeScript
 * valide os argumentos passados para a fábrica de listas.
 */
export interface DevicesListFilters {
    query?: string;
    category?: string;
    status?: StatusFilterType;
}

/**
 * Padrão Query Key Factory
 * Garante hierarquia determinística e tipagem estrita
 */
export const devicesKeys = {
    all: ["devices"] as const,
    lists: () => [...devicesKeys.all, "list"] as const,
    list: (filters: DevicesListFilters = {}) => [...devicesKeys.lists(), { filters }] as const,
    details: () => [...devicesKeys.all, "detail"] as const,
    detail: (id: string) => [...devicesKeys.details(), id] as const,
};