import { PublicLayout } from "./PublicLayout";

export default function Privacy() {
  return (
    <PublicLayout title="Privacy Notice">
      <p><em>Last updated: July 1, 2026</em></p>

      <h2 className="text-2xl font-bold mt-8">1. Who we are</h2>
      <p><strong>Tamayzak</strong> ("we", "us", "our") operates the Tamayzak study platform. We act as the data controller for personal data processed through the Service. You can reach us at <a href="mailto:privacy@tamayzak.com" className="underline">privacy@tamayzak.com</a>.</p>

      <h2 className="text-2xl font-bold mt-8">2. Data we collect</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Account data:</strong> email address, password hash, name/username, language preference, sign-in provider (Google/Apple).</li>
        <li><strong>Learning data:</strong> chosen subjects, flashcard progress, quiz answers, notes and drawings you create, to-do items, session/streak history, points.</li>
        <li><strong>AI interactions:</strong> prompts you submit to the essay grader, MCQ generator, video-to-notes, psychological assistant and study companion, together with the generated outputs.</li>
        <li><strong>Parent/child linkage:</strong> parent access codes and follow-up records if you use the parent dashboard.</li>
        <li><strong>Messaging identifiers:</strong> your Telegram user ID if you link the reminder bot.</li>
        <li><strong>Payment data:</strong> handled by our payment provider Paddle; we only store subscription status and a customer reference — we do not store card details.</li>
        <li><strong>Technical data:</strong> device/browser info, IP address, usage/telemetry, error logs.</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8">3. Why we use it (purposes & legal bases)</h2>
      <ul className="list-disc pl-6 space-y-2">
        <li>Providing the Service (contract performance).</li>
        <li>Personalising study plans, streaks and progress (contract performance).</li>
        <li>Security, fraud prevention and abuse detection (legitimate interests).</li>
        <li>Improving features and fixing bugs (legitimate interests).</li>
        <li>Customer support (contract performance / legitimate interests).</li>
        <li>Complying with legal obligations (legal obligation).</li>
        <li>Optional marketing/updates only where you have consented (consent).</li>
      </ul>

      <h2 className="text-2xl font-bold mt-8">4. Sharing</h2>
      <p>We share personal data with:</p>
      <ul className="list-disc pl-6 space-y-2">
        <li><strong>Paddle.com</strong> — our Merchant of Record for sale of the Service, subscription management, payments, tax compliance and invoicing.</li>
        <li><strong>Hosting and infrastructure providers</strong> (database, edge functions, storage).</li>
        <li><strong>AI providers</strong> that process your prompts to generate outputs.</li>
        <li><strong>Telegram</strong> if you enable the reminder bot.</li>
        <li><strong>Professional advisers</strong> (legal, accounting) and <strong>authorities</strong> when required by law.</li>
      </ul>
      <p>We do not sell your personal data.</p>

      <h2 className="text-2xl font-bold mt-8">5. International transfers</h2>
      <p>Some of our processors are located outside your country. Where required we rely on appropriate safeguards such as Standard Contractual Clauses or adequacy decisions.</p>

      <h2 className="text-2xl font-bold mt-8">6. Retention</h2>
      <p>We keep personal data only for as long as needed to provide the Service or to comply with legal obligations. When you close your account we delete or anonymise your data within a reasonable period, except where retention is required (e.g. tax or fraud records).</p>

      <h2 className="text-2xl font-bold mt-8">7. Your rights</h2>
      <p>Subject to applicable law you may have the right to access, rectify, delete, restrict, or port your personal data, to object to processing, and to withdraw consent. You may also have the right to lodge a complaint with your local data protection authority. To exercise these rights contact <a href="mailto:privacy@tamayzak.com" className="underline">privacy@tamayzak.com</a>. We aim to respond within 30 days.</p>

      <h2 className="text-2xl font-bold mt-8">8. Security</h2>
      <p>We use appropriate technical and organisational measures (encryption in transit, access controls, principle of least privilege, audit logging) to protect personal data. No system is 100% secure, and we cannot guarantee absolute security.</p>

      <h2 className="text-2xl font-bold mt-8">9. Cookies & similar technologies</h2>
      <p>We use essential cookies/local storage to keep you signed in and remember preferences (language, subject, theme). We may use limited analytics to understand aggregate usage. We do not run third-party advertising cookies.</p>

      <h2 className="text-2xl font-bold mt-8">10. Children</h2>
      <p>The Service is designed for sixth-grade students. Where you are under the age of digital consent in your jurisdiction, a parent or guardian should review this notice and provide consent on your behalf.</p>

      <h2 className="text-2xl font-bold mt-8">11. Changes</h2>
      <p>We may update this notice. Material changes will be notified via the Service.</p>
    </PublicLayout>
  );
}