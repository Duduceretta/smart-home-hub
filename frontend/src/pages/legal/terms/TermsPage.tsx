import { useTranslation } from "react-i18next";
import { LegalLayout } from "../components/LegalLayout";
import { TermsContentEn } from "./TermsContentEn";
import { TermsContentPt } from "./TermsContentPt";

export function TermsPage() {
	const { t, i18n } = useTranslation("legal");
	const isPt = i18n.language?.toLowerCase().startsWith("pt");

	const termsToc = [
		{
			id: "natureza-servico",
			title: t("terms.toc.naturezaServico", "Natureza do Serviço e Estágio"),
		},
		{
			id: "aceitacao",
			title: t("terms.toc.aceitacao", "Aceitação dos Termos"),
		},
		{
			id: "responsabilidades",
			title: t("terms.toc.responsabilidades", "Responsabilidades do Usuário"),
		},
		{
			id: "dispositivos",
			title: t("terms.toc.dispositivos", "Uso com Dispositivos Físicos"),
		},
		{
			id: "terceiros",
			title: t("terms.toc.terceiros", "Integrações e Serviços de Terceiros"),
		},
		{
			id: "disponibilidade",
			title: t("terms.toc.disponibilidade", "Isenção de Garantias e Limites"),
		},
		{
			id: "propriedade",
			title: t("terms.toc.propriedade", "Propriedade Intelectual"),
		},
		{
			id: "alteracoes",
			title: t("terms.toc.alteracoes", "Alterações nos Termos"),
		},
		{ id: "contato", title: t("terms.toc.contato", "Contato e Suporte") },
	];

	return (
		<LegalLayout
			title={t("terms.title", "Termos de Serviço")}
			subtitle={t(
				"terms.subtitle",
				"Condições e diretrizes para utilização da plataforma de automação residencial Nexus Hub.",
			)}
			lastUpdated={t("terms.lastUpdated", "10 de setembro de 2026")}
			tableOfContents={termsToc}
			counterpartLink={{
				to: "/legal/privacy",
				label: t(
					"terms.counterpartLabel",
					"Consulte também nossa Política de Privacidade (LGPD)",
				),
			}}
		>
			{isPt ? <TermsContentPt /> : <TermsContentEn />}
		</LegalLayout>
	);
}

export default TermsPage;
