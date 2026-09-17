/**
 * Suspense fallbacks for each lazy-loaded auth page (/login, /register,
 * /forgot-password, /reset-password, /verify-email), rendered inside
 * AuthLayout's already-centered outlet slot (see Router.tsx / withAuthFallback).
 *
 * Field-by-field skeletons instead of a generic spinner or a single shared
 * shape: unlike the dashboard's code-split boundaries (grids/tables whose
 * final shape isn't knowable ahead of the fetch), these 5 auth routes are a
 * fixed, statically known set — each one's card dimensions and field layout
 * never change at runtime, so there's no reason to approximate. Mirrors the
 * "skeleton over spinner for structured content" rule from
 * docs/ui-and-design-system.md §11.
 *
 * Deliberately dependency-free (no react-hook-form, no Button, no
 * FormInput/PasswordInput, no i18n): importing any of the real
 * *Form.tsx components here would defeat the whole point of splitting them
 * into their own chunks in the first place (see the comment above
 * withAuthFallback in Router.tsx) — Router.tsx imports this file eagerly,
 * so anything it pulls in ships in the main bundle. Some field markup is
 * duplicated across the 5 skeletons below instead of sharing a component
 * with the real forms for that reason.
 */

const fieldLabel = "h-3.5 rounded bg-surface-high/80";
const fieldInput =
	"h-11 sm:h-10 w-full rounded-lg border border-border-subtle bg-surface-container/60";
const fieldErrorSpace = "min-h-4.5";
const submitButton = "h-11 w-full rounded-lg bg-surface-high";
const cardBase =
	"relative w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface-low/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl animate-pulse";

export function LoginSkeleton() {
	return (
		<div role="status" aria-busy="true" className={`${cardBase} max-w-95`}>
			<span className="sr-only">Carregando formulário de login...</span>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5 space-y-2">
				<div className="h-7 sm:h-8 w-40 rounded bg-surface-high/80" />
				<div className="h-4 w-56 rounded bg-surface-high/40" />
			</div>

			<div className="flex flex-col gap-1">
				<div className="space-y-1">
					<div className={`${fieldLabel} w-14`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="space-y-1">
					<div className="flex items-center justify-between">
						<div className={`${fieldLabel} w-16`} />
						<div className="h-3 w-24 rounded bg-surface-high/40" />
					</div>
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="pt-1">
					<div className={submitButton} />
				</div>
			</div>

			<div className="relative mt-3">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-border-subtle" />
				</div>
			</div>

			<div className="mt-3">
				<div className={fieldInput} />
			</div>

			<div className="mt-4 flex justify-center">
				<div className="h-4 w-48 rounded bg-surface-high/40" />
			</div>
		</div>
	);
}

export function RegisterSkeleton() {
	return (
		<div role="status" aria-busy="true" className={`${cardBase} max-w-102`}>
			<span className="sr-only">Carregando formulário de cadastro...</span>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5 space-y-2">
				<div className="h-7 sm:h-8 w-44 rounded bg-surface-high/80" />
				<div className="h-4 w-60 rounded bg-surface-high/40" />
			</div>

			<div className="flex flex-col gap-1">
				<div className="space-y-1">
					<div className={`${fieldLabel} w-12`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="space-y-1">
					<div className={`${fieldLabel} w-14`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="space-y-1">
					<div className={`${fieldLabel} w-16`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="space-y-1">
					<div className={`${fieldLabel} w-28`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="pt-1">
					<div className={submitButton} />
					<div className="mt-2 flex justify-center">
						<div className="h-3 w-56 rounded bg-surface-high/30" />
					</div>
				</div>
			</div>

			<div className="relative mt-2.5">
				<div className="absolute inset-0 flex items-center">
					<span className="w-full border-t border-border-subtle" />
				</div>
			</div>

			<div className="mt-2.5">
				<div className={fieldInput} />
			</div>

			<div className="mt-3.5 flex justify-center">
				<div className="h-4 w-52 rounded bg-surface-high/40" />
			</div>
		</div>
	);
}

export function ForgotPasswordSkeleton() {
	return (
		<div role="status" aria-busy="true" className={`${cardBase} max-w-95`}>
			<span className="sr-only">
				Carregando formulário de recuperação de senha...
			</span>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5 space-y-2">
				<div className="h-7 sm:h-8 w-48 rounded bg-surface-high/80" />
				<div className="h-4 w-64 rounded bg-surface-high/40" />
			</div>

			<div className="flex flex-col gap-1">
				<div className="space-y-1">
					<div className={`${fieldLabel} w-14`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="pt-2">
					<div className={submitButton} />
				</div>

				<div className="mt-4 flex justify-center">
					<div className="h-4 w-52 rounded bg-surface-high/40" />
				</div>
			</div>
		</div>
	);
}

export function ResetPasswordSkeleton() {
	return (
		<div role="status" aria-busy="true" className={`${cardBase} max-w-95`}>
			<span className="sr-only">
				Carregando formulário de redefinição de senha...
			</span>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="mb-4 sm:mb-5 space-y-2">
				<div className="h-7 sm:h-8 w-52 rounded bg-surface-high/80" />
				<div className="h-4 w-44 rounded bg-surface-high/40" />
			</div>

			<div className="flex flex-col gap-1">
				<div className="space-y-1">
					<div className={`${fieldLabel} w-20`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="space-y-1">
					<div className={`${fieldLabel} w-36`} />
					<div className={fieldInput} />
					<div className={fieldErrorSpace} />
				</div>

				<div className="pt-2 mt-2">
					<div className={submitButton} />
				</div>

				<div className="mt-4 flex justify-center">
					<div className="h-4 w-40 rounded bg-surface-high/40" />
				</div>
			</div>
		</div>
	);
}

export function VerifyEmailSkeleton() {
	return (
		<div
			role="status"
			aria-busy="true"
			className={`${cardBase} max-w-95 text-center`}
		>
			<span className="sr-only">Carregando confirmação de e-mail...</span>
			<div className="shimmer-line absolute left-0 right-0 top-0 h-px" />

			<div className="flex flex-col items-center justify-center py-6">
				<div className="mb-4 h-14 w-14 rounded-2xl bg-surface-container" />
				<div className="mb-2 h-6 sm:h-7 w-56 rounded bg-surface-high/80" />
				<div className="h-4 w-64 max-w-full rounded bg-surface-high/40" />
			</div>
		</div>
	);
}
