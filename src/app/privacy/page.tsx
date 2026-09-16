import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Privacy policy — Invora",
  description: "How Invora collects, uses and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link href="/home" className="mb-4 inline-flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/invora-mark.png" alt="Invora" className="h-7 w-7" />
        <span className="text-lg font-semibold tracking-tight">Invora</span>
      </Link>
      <h1 className="page-title mb-1">Privacy policy</h1>
      <p className="meta mb-8">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="prose-sm grid gap-6 text-[14px] leading-relaxed text-ink-700 dark:text-gray-300">
        <section>
          <h2 className="section-title mb-1">1. Who we are</h2>
          <p>
            Invora is an invoicing and finance application operated by the business that runs this
            deployment, reachable at <a className="text-brand-600 hover:underline" href="https://invoice.naoufalelouahabi.com">invoice.naoufalelouahabi.com</a>.
            For any privacy question or request, contact <a className="text-brand-600 hover:underline" href="mailto:contact@naoufalelouahabi.com">contact@naoufalelouahabi.com</a>.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">2. Data we collect</h2>
          <ul className="ml-5 list-disc">
            <li><strong>Account data:</strong> your name, email address and a hashed password.</li>
            <li><strong>Business data you enter:</strong> companies, clients, invoices, quotes, credit notes, payments, products and notes.</li>
            <li><strong>Connected email:</strong> if you connect a mailbox (SMTP or Google), we store the address, settings and an encrypted credential or OAuth refresh token needed to send on your behalf.</li>
            <li><strong>WhatsApp:</strong> if you enable WhatsApp sending, we store the linked-session credentials on the server so messages can be sent from your account.</li>
            <li><strong>Technical data:</strong> a session cookie and basic server logs required to operate and secure the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title mb-1">3. How we use your data</h2>
          <ul className="ml-5 list-disc">
            <li>To provide the service: create, store and render your invoices and reports.</li>
            <li>To send invoices, quotes and reminders to your clients through the email or WhatsApp account you connect.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To comply with legal obligations, including invoice retention.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title mb-1">4. Legal basis</h2>
          <p>
            We process your data to perform the service you requested, to comply with legal obligations,
            and on the basis of your consent where you connect third-party accounts (Google, WhatsApp).
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">5. Third-party services</h2>
          <p>
            When you choose to connect them, we use Google (Gmail API) to send email, and WhatsApp Web to send
            messages, strictly on your behalf and only to the recipients you specify. We do not sell your data
            and we do not use it for advertising. Your use of those services is also governed by their own terms.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">6. Data retention</h2>
          <p>
            Invoices and related accounting records are retained for ten (10) years in accordance with
            article 211 of the Moroccan Code Général des Impôts. Account and connection data are retained while
            your account is active and deleted on request, except where retention is legally required.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">7. Security</h2>
          <p>
            Traffic is encrypted with HTTPS. Email credentials and OAuth tokens are encrypted at rest with
            AES-256-GCM. Access to the application and its database is restricted to the operator. No method of
            storage is perfectly secure, but we take reasonable measures to protect your data.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">8. Your rights</h2>
          <p>
            You may access, correct, export or delete your data. You can export invoices and reports from the
            application, and request deletion of your account by contacting us. Some records may be retained
            where the law requires it.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">9. Cookies</h2>
          <p>We use a single essential session cookie to keep you signed in. We do not use advertising cookies.</p>
        </section>

        <section>
          <h2 className="section-title mb-1">10. Changes</h2>
          <p>We may update this policy. Material changes will be reflected by the date at the top of this page.</p>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
