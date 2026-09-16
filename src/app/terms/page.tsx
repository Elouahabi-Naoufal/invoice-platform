import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Terms of service — Invora",
  description: "The terms governing use of Invora.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <Link href="/home" className="mb-4 inline-flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/invora-mark.png" alt="Invora" className="h-7 w-7" />
        <span className="text-lg font-semibold tracking-tight">Invora</span>
      </Link>
      <h1 className="page-title mb-1">Terms of service</h1>
      <p className="meta mb-8">Last updated: {new Date().toISOString().slice(0, 10)}</p>

      <div className="grid gap-6 text-[14px] leading-relaxed text-ink-700 dark:text-gray-300">
        <section>
          <h2 className="section-title mb-1">1. Acceptance</h2>
          <p>
            Invora is provided by <strong>Orbit Labs</strong>. By creating an account or using Invora, you agree to
            these terms. If you do not agree, do not use the service.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">2. The service</h2>
          <p>
            Invora lets you create and manage invoices, quotes, credit notes and payments, send documents to
            your clients by email or WhatsApp, and produce reports. The service is provided for your business use.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">3. Accounts</h2>
          <p>
            You are responsible for keeping your credentials confidential and for all activity under your
            account. You must provide accurate information and may invite team members at your own discretion.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">4. Acceptable use</h2>
          <ul className="ml-5 list-disc">
            <li>Do not use the service for unlawful, fraudulent or misleading activity.</li>
            <li>Do not send unsolicited or abusive messages through the connected WhatsApp channel.</li>
            <li>Do not attempt to disrupt, reverse-engineer or gain unauthorised access to the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="section-title mb-1">5. Your data</h2>
          <p>
            You own the business data you enter. You are responsible for its accuracy and for having the right to
            store your clients' information. Our handling of data is described in the{" "}
            <Link href="/privacy" className="text-brand-600 hover:underline">privacy policy</Link>.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">6. Third-party services</h2>
          <p>
            Sending uses WhatsApp Web on your own account, which is governed by its own terms, and you are
            responsible for complying with them.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">7. Availability</h2>
          <p>The service is provided on a best-effort basis and may be unavailable during maintenance or events beyond our control.</p>
        </section>

        <section>
          <h2 className="section-title mb-1">8. Disclaimer</h2>
          <p>
            The service is provided "as is". While Invora helps you produce documents that follow Moroccan
            invoicing rules, you remain responsible for the legal and tax correctness of your invoices and filings.
          </p>
        </section>

        <section>
          <h2 className="section-title mb-1">9. Limitation of liability</h2>
          <p>To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of the service.</p>
        </section>

        <section>
          <h2 className="section-title mb-1">10. Termination</h2>
          <p>You may stop using the service at any time. We may suspend accounts that breach these terms.</p>
        </section>

        <section>
          <h2 className="section-title mb-1">11. Governing law</h2>
          <p>These terms are governed by Moroccan law.</p>
        </section>

        <section>
          <h2 className="section-title mb-1">12. Contact</h2>
          <p>
            Questions about these terms: <a className="text-brand-600 hover:underline" href="mailto:contact@naoufalelouahabi.com">contact@naoufalelouahabi.com</a>.
          </p>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
