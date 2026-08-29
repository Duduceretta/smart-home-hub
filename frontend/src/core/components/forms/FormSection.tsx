import type { ReactNode } from "react";

interface FormSectionProps {
	title: string;
	/** Quando a seção tem um único input associado, liga o rótulo a ele via
	 * `<label htmlFor>` em vez de `<h3>` solto — sem isso o input fica sem
	 * nome acessível (getByLabel falha, leitor de tela não anuncia nada). */
	htmlFor?: string;
	children: ReactNode;
}

const TITLE_CLASSNAME =
	"text-xs font-medium uppercase tracking-wider text-muted-foreground";

/** Bloco padrão de seção de formulário em Dialogs: rótulo/título + conteúdo. */
export function FormSection({ title, htmlFor, children }: FormSectionProps) {
	return (
		<div className="flex flex-col gap-2">
			{htmlFor ? (
				<label htmlFor={htmlFor} className={TITLE_CLASSNAME}>
					{title}
				</label>
			) : (
				<h3 className={TITLE_CLASSNAME}>{title}</h3>
			)}
			{children}
		</div>
	);
}
