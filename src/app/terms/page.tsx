import { publicMetadata } from "@/lib/seo";

export const metadata = publicMetadata({
  title: "Terms of Service",
  description: "Read the terms governing use of Vexa's educational resources, accounts, courses, and managed school assessment tools.",
  path: "/terms",
});

const sections = [
  ["Using Vexa", "Vexa provides educational support, learning resources, courses, question organization, and managed assessment-preparation tools. You must use the service lawfully and provide accurate information when creating an account or contacting us."],
  ["Managed teacher and school access", "Teacher and school assessment features may be offered through a demonstration, pilot, or managed rollout. Access, content coverage, onboarding, and any applicable pricing are confirmed separately; they are not implied by simply registering for a student account."],
  ["Educational support", "Vexa content supports teaching, learning, and assessment preparation. It does not guarantee marks, examination outcomes, admissions, or institutional approval."],
  ["Content rights", "Do not upload confidential papers, restricted examination material, personal data you are not authorized to share, or content that infringes another party's rights. You remain responsible for material you provide."],
  ["Board independence", "Vexa is an independent platform and is not officially affiliated with, endorsed by, or operated by CBSE, Cambridge International, or any other examination board unless explicitly stated in writing."],
  ["Accounts and security", "Keep login credentials secure and notify Vexa if you suspect unauthorized use. Access may be limited or suspended when needed to protect users, data, or the platform."],
  ["Courses, payments, and refunds", "Where a paid course or service is offered, the displayed price and checkout information apply. Any refund commitment must be confirmed by the applicable published policy or written agreement before purchase."],
  ["Availability and changes", "We work to keep Vexa reliable but cannot promise uninterrupted availability. Features and content may change as the platform develops, particularly during early access and school pilots."],
  ["Contact", "Questions about these terms can be sent to support.vexaonline@gmail.com. Continued use after an updated version is published means the current terms apply to future use."],
];

export default function TermsPage() {
  return <article className="container mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20"><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Vexa policies</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Terms of Service</h1><p className="mt-5 leading-7 text-muted-foreground">These terms describe the responsible use of Vexa by visitors, students, teachers, and schools.</p><p className="mt-3 text-sm text-muted-foreground">Last updated: 22 August 2026</p><div className="mt-10 space-y-9">{sections.map(([heading, body]) => <section key={heading}><h2 className="text-xl font-bold">{heading}</h2><p className="mt-3 leading-7 text-muted-foreground">{body}</p></section>)}</div></article>;
}
