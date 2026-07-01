import { PublicLayout } from "./PublicLayout";

export default function Refund() {
  return (
    <PublicLayout title="Refund Policy">
      <p><em>Last updated: July 1, 2026</em></p>

      <h2 className="text-2xl font-bold mt-8">30-day money-back guarantee</h2>
      <p>We want you to be happy with Tamayzak. If you are not satisfied with a paid subscription, you can request a full refund within <strong>30 days</strong> of your original purchase date.</p>

      <h2 className="text-2xl font-bold mt-8">How to request a refund</h2>
      <p>Refunds are processed by our payment provider and Merchant of Record, <strong>Paddle.com</strong>. To request a refund:</p>
      <ol className="list-decimal pl-6 space-y-2">
        <li>Visit <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="underline">paddle.net</a> and enter the email address you used at checkout to manage your order.</li>
        <li>Or email our support team at <a href="mailto:support@tamayzak.com" className="underline">support@tamayzak.com</a> with your order/receipt number and we will help you submit the request.</li>
      </ol>
      <p>Approved refunds are returned to your original payment method. Processing times depend on your bank or card issuer.</p>

      <h2 className="text-2xl font-bold mt-8">Renewals</h2>
      <p>Subscriptions renew automatically. You can cancel a subscription at any time to prevent further renewals from your account settings or via <a href="https://paddle.net" target="_blank" rel="noopener noreferrer" className="underline">paddle.net</a>. If you were charged for a renewal you did not intend, contact us within 30 days and we will work with Paddle to refund it.</p>

      <h2 className="text-2xl font-bold mt-8">Contact</h2>
      <p>For any refund question, contact <a href="mailto:support@tamayzak.com" className="underline">support@tamayzak.com</a>.</p>
    </PublicLayout>
  );
}