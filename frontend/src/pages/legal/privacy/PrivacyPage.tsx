import { useTranslation } from "react-i18next";
import { LegalLayout } from "../components/LegalLayout";
import { PrivacyContentEn } from "./PrivacyContentEn";
import { PrivacyContentPt } from "./PrivacyContentPt";

export function PrivacyPage() {
	const { t, i18n } = useTranslation("legal");
	const isPt = i18n.language?.toLowerCase().startsWith("pt");

	const privacyToc = [
		{
			id: "responsavel",
			title: t("privacy.toc.responsavel", "Responsável pelo Tratamento"),
		},
		{
			id: "dados-coletados",
			title: t("privacy.toc.dadosColetados", "Dados Pessoais Coletados"),
		},
		{
			id: "finalidades",
			title: t("privacy.toc.finalidades", "Finalidades e Bases Legais (LGPD)"),
		},
		{
			id: "compartilhamento",
			title: t(
				"privacy.toc.compartilhamento",
				"Compartilhamento com Terceiros",
			),
		},
		{
			id: "retencao",
			title: t("privacy.toc.retencao", "Retenção e Descarte de Dados"),
		},
		{
			id: "direitos-titular",
			title: t("privacy.toc.direitosTitular", "Direitos do Titular de Dados"),
		},
		{
			id: "cookies-armazenamento",
			title: t(
				"privacy.toc.cookiesArmazenamento",
				"Cookies e Armazenamento Local",
			),
		},
		{
			id: "seguranca",
			title: t("privacy.toc.seguranca", "Segurança da Informação"),
		},
		{
			id: "contato",
			title: t("privacy.toc.contato", "Contato e Encarregado (DPO)"),
		},
	];

	return (
		<LegalLayout
			title={t("privacy.title", "Política de Privacidade")}
			subtitle={t(
				"privacy.subtitle",
				"Como o Nexus Hub coleta, utiliza, armazena e protege seus dados pessoais de acordo com a LGPD.",
			)}
			lastUpdated={t("privacy.lastUpdated", "10 de setembro de 2026")}
			tableOfContents={privacyToc}
			counterpartLink={{
				to: "/legal/terms",
				label: t(
					"privacy.counterpartLabel",
					"Acesse também os Termos de Serviço do Nexus Hub",
				),
			}}
		>
			{isPt ? <PrivacyContentPt /> : <PrivacyContentEn />}
		</LegalLayout>
	);
}

export default PrivacyPage;
