import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Privacy Policy",
  description: "Read how Vexa handles account, learning, contact, cookie, and analytics information.",
  path: "/privacy",
});

const sections = [
  ["Information we collect", "Vexa may collect account details such as name and email, learning and progress activity used to provide the service, payment references needed to verify purchases, and information submitted through contact or demo forms."],
  ["How information is used", "We use information to operate accounts, provide learning and assessment features, respond to enquiries, maintain security, understand basic product usage, and improve the service."],
  ["Cookies and analytics", "Vexa may use essential cookies for sign-in and preferences, together with basic analytics that help us understand page and feature usage. Browser settings can be used to manage non-essential storage where supported."],
  ["Payments and service providers", "Payments and parts of the service may be processed by specialist providers. Vexa does not need to store complete card details. Providers process information under their own terms and safeguards."],
  ["Data sharing and sale", "Vexa does not sell personal data. Information may be shared with service providers only where needed to operate, secure, host, support, or legally maintain the service."],
  ["Educational content", "Users should upload or submit only educational material they are permitted to use. Confidential, restricted, or unlawfully copied examination-board content should not be uploaded."],
  ["Retention and choices", "Information is retained only as reasonably needed for the service, legal obligations, security, or record keeping. You may contact Vexa to ask about correction or deletion of eligible personal information."],
  ["Contact", "Privacy questions can be sent to support.vexaonline@gmail.com. We may update this policy as Vexa develops and will publish the current version on this page."],
];

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" intro="This policy explains, in plain language, how Vexa handles information when teachers, students, schools, and visitors use the platform." sections={sections} />;
}

function LegalPage({ title, intro, sections: content }: { title: string; intro: string; sections: string[][] }) {
  return <article className="container mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Vexa policies</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1><p className="mt-5 leading-7 text-muted-foreground">{intro}</p><p className="mt-3 text-sm text-muted-foreground">Last updated: 22 August 2026</p><div className="mt-10 space-y-9">{content.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-bold">{heading}</h2><p className="mt-3 leading-7 text-muted-foreground">{body}</p></section>)}</div></article>;
}
