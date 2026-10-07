import { useTranslation } from "react-i18next";
import { cn } from "@/core/utils";
import { QUICK_EDIT_BODY_CLASSNAME } from "./SceneQuickEdit";

interface SceneQuickEditPlaceholderProps {
	message: string;
}

/**
 * Coluna lateral sem cena para editar (nenhuma criada ainda, ou a busca não achou nada):
 * mantém o mesmo cartão da edição rápida, vazio, para o layout da tela não mudar.
 */
export function SceneQuickEditPlaceholder({
	message,
}: SceneQuickEditPlaceholderProps) {
	const { t } = useTranslation("scenes");

	return (
		<section
			aria-label={t("quick.title")}
			className="rounded-xl border border-dashed border-border-subtle bg-surface-container/40"
		>
			<header className="flex flex-col border-b border-dashed border-border-subtle p-4">
				<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
					{t("quick.title")}
				</span>
			</header>
			<p
				className={cn(
					"flex items-center p-4 text-sm text-muted-foreground",
					QUICK_EDIT_BODY_CLASSNAME,
				)}
			>
				{message}
			</p>
		</section>
	);
}
