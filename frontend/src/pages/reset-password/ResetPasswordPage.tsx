import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { AuthLayout } from "@/widgets/layout/AuthLayout";

export function ResetPasswordPage() {
	return (
		<AuthLayout>
			<ResetPasswordForm />
		</AuthLayout>
	);
}
