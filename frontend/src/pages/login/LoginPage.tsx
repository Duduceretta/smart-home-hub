import { LoginForm } from "@/features/auth/components/LoginForm";
import { AuthLayout } from "@/widgets/layout/AuthLayout";

export function LoginPage() {
	return (
		<AuthLayout>
			<LoginForm />
		</AuthLayout>
	);
}
