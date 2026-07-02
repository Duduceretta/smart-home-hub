import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { AuthLayout } from "@/widgets/layout/AuthLayout";

export function RegisterPage() {
	return (
		<AuthLayout>
			<RegisterForm />
		</AuthLayout>
	);
}
