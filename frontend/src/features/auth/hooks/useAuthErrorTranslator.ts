import { useTranslation } from "react-i18next";

/**
 * Hook utilitário para tradução dinâmica de chaves de erro do domínio de autenticação ("auth").
 */
export function useAuthErrorTranslator() {
	const { t } = useTranslation("auth");

	return (errorKey?: string | null): string | undefined => {
		if (!errorKey) return undefined;
		return t(errorKey, errorKey);
	};
}
