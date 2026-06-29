export const Logger = {
    error: (message: string, error?: unknown) => {
        if (import.meta.env.DEV) {
            console.error(`[🔴 ERROR] ${message}`, error);
            return;
        }
    },

    info: (message: string, data?: unknown) => {
        if (import.meta.env.DEV) {
            console.info(`[🔵 INFO] ${message}`, data);
        }
    },
    
};