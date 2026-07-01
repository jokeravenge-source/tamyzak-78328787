import { PublicLayout } from "./PublicLayout";

export default function Terms() {
  return (
    <PublicLayout title="Terms & Conditions">
      <p><em>Last updated: July 1, 2026</em></p>

      <h2 className="text-2xl font-bold mt-8">1. Who we are</h2>
      <p>These Terms & Conditions ("Terms") govern your use of the Tamayzak study platform, its website, mobile experiences and related services (the "Service"), operated by <strong>Tamayzak</strong> ("Tamayzak", "we", "us", "our"). By creating an account or using the Service you agree to be bound by these Terms.</p>

      <h2 className="text-2xl font-bold mt-8">2. The Service</h2>
      <p>Tamayzak is a bilingual (Arabic/English) study platform aimed at Iraqi sixth-grade scientific-stream students. Features include flashcards, AI-generated MCQs, video-to-notes, an essay grader, live study battles, a psychological assistant and progress tracking. Features are provided "as is" and may evolve over time.</p>

      <h2 className="text-2xl font-bold mt-8">3. Eligibility & accounts</h2>
      <p>You must have authority to accept these Terms, or where you are a minor, have permission from a parent or legal guardian. You are responsible for keeping your credentials confidential and for activity carried out under your account. You must provide accurate information and keep it up to date.</p>

      <h2 className="text-2xl font-bold mt-8">4. Acceptable use</h2>
      <p>You agree not to misuse the Service, including by: (a) using it for any unlawful purpose; (b) sending spam, fraud or malicious content; (c) infringing intellectual property or privacy rights; (d) attempting to interfere with the security or integrity of the Service (probing, scraping, malware, reverse engineering, circumventing technical limits); or (e) reselling or redistributing the Service without our written consent.</p>

      <h2 className="text-2xl font-bold mt-8">5. AI features</h2>
      <p>The Service uses generative AI to produce study notes, questions, feedback and other content. AI outputs can be inaccurate or incomplete and are not a substitute for professional advice. You remain responsible for your prompts, your use of outputs, verifying accuracy, and having the necessary rights to any content you upload. We may filter, remove or refuse outputs, or suspend accounts that repeatedly violate these Terms. You must not use the AI features to generate illegal content, deepfakes, hate speech, harassment, malware, or attempts to jailbreak the system.</p>

      <h2 className="text-2xl font-bold mt-8">6. Intellectual property</h2>
      <p>Tamayzak retains all rights, title and interest in the Service, including the software, documentation and branding. You are granted a limited, non-exclusive, non-transferable right to use the Service within the plan you have selected.</p>
      <p>For user-generated content (notes, uploads, drawings, etc.), you retain ownership. You grant Tamayzak a limited license to host and process that content solely to provide the Service. You are responsible for having the rights to any content you upload; we provide a takedown pathway at the contact address below for rights-holder complaints.</p>

      <h2 className="text-2xl font-bold mt-8">7. Payments, billing and subscriptions</h2>
      <p>Paid plans (including Premium at $2/month) are sold through our online reseller Paddle.com. <strong>Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service inquiries and handles returns.</strong> By purchasing, you also agree to Paddle's <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer" className="underline">Buyer Terms</a>, which govern payment, tax, invoicing, cancellations and refunds. Subscriptions renew automatically at the end of each billing period until cancelled.</p>

      <h2 className="text-2xl font-bold mt-8">8. Cancellation & refunds</h2>
      <p>You may cancel your subscription at any time from your account or via Paddle. Refunds are handled under our <a href="/refund" className="underline">Refund Policy</a>.</p>

      <h2 className="text-2xl font-bold mt-8">9. Suspension & termination</h2>
      <p>We may suspend or terminate your access for material breach of these Terms, non-payment, security or fraud risk, or repeated/serious policy violations. On termination your access ends; you may request an export of your personal data within a reasonable time window before deletion.</p>

      <h2 className="text-2xl font-bold mt-8">10. Warranties & liability</h2>
      <p>The Service is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, Tamayzak disclaims all implied warranties, including merchantability and fitness for a particular purpose. Our aggregate liability for any claim shall not exceed the fees you paid us in the 12 months preceding the claim. We are not liable for indirect, consequential, special, or punitive damages, including loss of profits, data or goodwill. Nothing in these Terms limits liability for fraud, death or personal injury where such limitation is prohibited by law.</p>

      <h2 className="text-2xl font-bold mt-8">11. Indemnity</h2>
      <p>You agree to indemnify Tamayzak against claims arising from your content, unlawful use of the Service, or breach of these Terms.</p>

      <h2 className="text-2xl font-bold mt-8">12. Changes</h2>
      <p>We may update these Terms from time to time. Material changes will be notified via the Service. Continued use after changes take effect constitutes acceptance.</p>

      <h2 className="text-2xl font-bold mt-8">13. Governing law</h2>
      <p>These Terms are governed by the laws of the jurisdiction where Tamayzak operates. Disputes will be resolved in the competent courts of that jurisdiction.</p>

      <h2 className="text-2xl font-bold mt-8">14. Contact</h2>
      <p>Questions about these Terms: <a href="mailto:support@tamayzak.com" className="underline">support@tamayzak.com</a>.</p>
    </PublicLayout>
  );
}