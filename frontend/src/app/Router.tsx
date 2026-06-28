import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";

const router = createBrowserRouter([
	{
		path: "/",
		element: (
			<div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
				<h1 className="text-xl">
					Layout Principal do Hub (Menu Lateral virá aqui)
				</h1>
			</div>
		),
	},
	{
		path: "/login",
		element: <LoginPage />,
	},
]);

export function Router() {
	return <RouterProvider router={router} />;
}
