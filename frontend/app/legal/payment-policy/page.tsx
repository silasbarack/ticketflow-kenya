import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Payment Policy | TicketFlow Kenya' };

export default function PaymentPolicyPage() {
  return (
    <LegalLayout title="Payment Policy" effectiveDate="27 June 2026">
      <p>
        This Payment Policy explains how payments are processed on TicketFlow Kenya, including
        M-Pesa payments, how platform commission is calculated, and what happens when a payment
        succeeds, fails, or is disputed. It forms part of our{' '}
        <a href="/legal/terms-and-conditions">Terms and Conditions</a>.
      </p>

      <h2>1. Supported payment methods</h2>
      <p>
        At launch, TicketFlow Kenya supports payments via <strong>M-Pesa STK Push</strong>{' '}
        (Lipa na M-Pesa Online), Safaricom's mobile money checkout. Our payment architecture is
        built to be modular, so additional methods such as card payments, Flutterwave, or Paystack
        may be added in future without changing how orders or tickets work.
      </p>

      <h2>2. How an M-Pesa payment works</h2>
      <ol>
        <li>You select tickets and create an order. The order is held as <strong>Pending</strong> and the selected tickets are reserved so they cannot be sold to someone else while you pay.</li>
        <li>You enter the M-Pesa phone number you wish to pay with and confirm.</li>
        <li>We send an STK Push request to Safaricom's Daraja API, which triggers a payment prompt on that phone number.</li>
        <li>You enter your M-Pesa PIN on your own device to authorize the payment. We never see or store your PIN.</li>
        <li>Safaricom sends us a callback confirming whether the payment succeeded or failed.</li>
        <li>
          <strong>Only that callback can mark your payment as successful</strong> — your ticket
          and order status are never set to &quot;paid&quot; based on what your browser reports,
          which protects you and Organizers from manipulated or spoofed payment confirmations.
        </li>
        <li>On success, your QR-code ticket(s) are generated immediately and become available under "My Tickets".</li>
      </ol>

      <h2>3. Payment statuses</h2>
      <ul>
        <li><strong>Pending</strong> — payment has been initiated and we are waiting for confirmation.</li>
        <li><strong>Success</strong> — payment confirmed by the payment provider; tickets are issued.</li>
        <li><strong>Failed</strong> — payment was not completed (e.g. insufficient funds, PIN entry cancelled, or timeout); any reserved tickets are released back into inventory.</li>
        <li><strong>Cancelled</strong> — the payment attempt was cancelled before completion.</li>
      </ul>

      <h2>4. Order statuses</h2>
      <ul>
        <li><strong>Pending</strong> — order created, awaiting successful payment.</li>
        <li><strong>Paid</strong> — payment confirmed; tickets issued.</li>
        <li><strong>Failed</strong> — payment did not succeed; the order did not result in a sale.</li>
        <li><strong>Cancelled</strong> — order cancelled before or instead of payment.</li>
      </ul>

      <h2>5. Platform commission</h2>
      <p>
        TicketFlow Kenya deducts a platform commission from each successfully paid order —{' '}
        <strong>7% of the ticket price by default</strong>. The remainder (the Organizer's
        earning) is recorded against the Organizer's account. Commission is only charged on
        completed, successful sales — there is no charge on pending, failed, or cancelled orders.
      </p>

      <h2>6. Currency and pricing</h2>
      <p>
        All prices on the Platform are listed and charged in Kenyan Shillings (KES) unless stated
        otherwise. Organizers are responsible for setting accurate ticket prices, including any
        applicable taxes they are required to account for.
      </p>

      <h2>7. Failed and pending payments</h2>
      <p>
        If an M-Pesa prompt times out, is cancelled, or fails, the order is marked{' '}
        <strong>Failed</strong> and any reserved ticket stock is automatically released so other
        customers can purchase it. You may simply attempt the purchase again. If you were charged
        by M-Pesa but your order still shows as pending or failed after a reasonable time, contact
        us immediately with your M-Pesa transaction message so we can investigate.
      </p>

      <h2>8. Refunds</h2>
      <p>
        Refund eligibility depends on the circumstances of the order — see our{' '}
        <a href="/legal/ticket-purchase-policy">Ticket Purchase Policy</a> for full details. In
        summary:
      </p>
      <ul>
        <li>If an event is cancelled or postponed by its Organizer without a rescheduled date, affected ticket holders are entitled to a refund.</li>
        <li>We do not process card or M-Pesa chargebacks directly; approved refunds are issued back to the original payment method (e.g. the M-Pesa number used) where technically possible.</li>
        <li>Refunds are not available simply because a Customer changes their mind, except where required by Kenyan consumer protection law.</li>
      </ul>

      <h2>9. Disputes and chargebacks</h2>
      <p>
        If you believe you were charged in error, contact us first at{' '}
        <strong>payments@ticketflow.co.ke</strong> with your order number and M-Pesa transaction
        code so we can investigate using our payment and audit records. We aim to resolve payment
        disputes within 14 business days.
      </p>

      <h2>10. Organizer payouts</h2>
      <p>
        Organizer earnings (ticket price minus platform commission) accrue against the
        Organizer's account as sales are confirmed. Payout schedules, methods, and any minimum
        payout thresholds will be communicated separately to Organizers and may evolve as the
        Platform grows; see our <a href="/legal/event-organizer-policy">Event Organizer Policy</a>.
      </p>

      <h2>11. Security</h2>
      <p>
        We do not store M-Pesa PINs, card numbers, or card CVV codes. Payment confirmations are
        received over secure, authenticated callbacks from our payment providers. Sensitive
        payment events are recorded in an internal audit log for fraud detection and dispute
        resolution.
      </p>

      <h2>12. Changes to this Policy</h2>
      <p>
        We may update this Payment Policy as we add new payment methods or as regulatory
        requirements change. The current version always applies to transactions made after its
        effective date.
      </p>
    </LegalLayout>
  );
}
