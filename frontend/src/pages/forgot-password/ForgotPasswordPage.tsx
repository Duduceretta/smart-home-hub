import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { AuthLayout } from "@/widgets/layout/AuthLayout";

export function ForgotPasswordPage() {
	return (
		<AuthLayout>
			<ForgotPasswordForm />
		</AuthLayout>
	);
}
