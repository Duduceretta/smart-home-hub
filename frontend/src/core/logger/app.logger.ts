export const Logger = {
    error: (message: string, error?: unknown) => {
        if (import.meta.env.DEV) {
            console.error(`[🔴 ERROR] ${message}`, error);
            return;
        }
        
        // PADRÃO BIG TECH: Em produção, enviamos para o APM
        // Exemplo: Sentry.captureException(error, { extra: { message } });
    },

    info: (message: string, data?: unknown) => {
        if (import.meta.env.DEV) {
            console.info(`[🔵 INFO] ${message}`, data);
            return;
        }

        // APMs modernos também gravam "breadcrumbs" (migalhas de pão)
        // Exemplo: Sentry.addBreadcrumb({ message, data, level: 'info' });
    },

    warn: (message: string, data?: unknown) => {
        if (import.meta.env.DEV) {
            console.warn(`[🟠 WARN] ${message}`, data);
        }
    }
};