import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type RenderOptions, render } from "@testing-library/react";
import type React from "react";
import type { ReactElement } from "react";
import { I18nextProvider } from "react-i18next";
import { ConfirmDialogProvider } from "@/core/components/providers/ConfirmDialogProvider";
import i18n from "@/core/i18n";

export function createTestQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
			mutations: {
				retry: false,
			},
		},
	});
}

interface ExtendedRenderOptions extends Omit<RenderOptions, "queries"> {
	queryClient?: QueryClient;
}

export function renderWithProviders(
	ui: ReactElement,
	{
		queryClient = createTestQueryClient(),
		...renderOptions
	}: ExtendedRenderOptions = {},
) {
	function Wrapper({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>
				<I18nextProvider i18n={i18n}>
					<ConfirmDialogProvider>{children}</ConfirmDialogProvider>
				</I18nextProvider>
			</QueryClientProvider>
		);
	}

	return {
		...render(ui, { wrapper: Wrapper, ...renderOptions }),
		queryClient,
	};
}

export * from "@testing-library/react";
export { default as userEvent } from "@testing-library/user-event";
