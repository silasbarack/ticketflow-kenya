import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Payment Policy | TicketFlow Kenya' };

export default function PaymentPolicyPage() {
  return (
    <LegalLayout title="Payment Policy" effectiveDate="29 June 2026">
      <p>
        This Payment Policy (the &quot;<strong>Policy</strong>&quot;) is the formal, institutional
        statement governing how payments are processed on the TicketFlow Kenya platform (the
        &quot;<strong>Platform</strong>&quot;), including M-Pesa payments, how Platform Commission
        is calculated, and what happens when a payment succeeds, fails, or is disputed. It forms
        an integral part of our <a href="/legal/terms-and-conditions">Terms and Conditions</a> and
        should be read together with them.
      </p>

      <h2>1. Definitions</h2>
      <ul>
        <li>
          <strong>&quot;Order&quot;</strong> means a Customer&apos;s request to purchase one or
          more Tickets, together with its associated payment record.
        </li>
        <li>
          <strong>&quot;Payment&quot;</strong> means the monetary transaction associated with an
          Order, initiated via a supported payment method.
        </li>
        <li>
          <strong>&quot;M-Pesa STK Push&quot;</strong> (also known as &quot;Lipa na M-Pesa
          Online&quot;) means Safaricom&apos;s mobile money checkout mechanism, accessed through
          the Daraja application programming interface.
        </li>
        <li>
          <strong>&quot;Daraja&quot;</strong> means Safaricom&apos;s official API platform used to
          initiate and confirm M-Pesa payments.
        </li>
        <li>
          <strong>&quot;Platform Commission&quot;</strong> means the percentage of the ticket price
          retained by TicketFlow Kenya on each successfully paid Ticket.
        </li>
        <li>
          <strong>&quot;Organizer Earning&quot;</strong> means the ticket price less the applicable
          Platform Commission, credited to the Organizer&apos;s account.
        </li>
        <li>
          <strong>&quot;Callback&quot;</strong> means the secure, authenticated message sent by a
          payment provider to our backend confirming the outcome of a Payment.
        </li>
      </ul>

      <h2>2. Supported payment methods</h2>
      <p>
        At launch, TicketFlow Kenya supports payments via <strong>M-Pesa STK Push</strong>{' '}
        (Lipa na M-Pesa Online), Safaricom&apos;s mobile money checkout. Our payment architecture
        is deliberately modular, so additional methods such as card payments, Flutterwave, or
        Paystack may be added in future without changing how Orders or Tickets fundamentally work.
      </p>

      <h2>3. How an M-Pesa payment works</h2>
      <ol>
        <li>
          You select Tickets and create an Order. The Order is held as <strong>Pending</strong> and
          the selected Tickets are reserved so they cannot be sold to another Customer while
          payment is completed.
        </li>
        <li>You enter the M-Pesa phone number you wish to pay with and confirm.</li>
        <li>We send an STK Push request to Daraja, which triggers a payment prompt on that phone number.</li>
        <li>You enter your M-Pesa PIN on your own device to authorise the payment. We never see, transmit, or store your PIN.</li>
        <li>Safaricom sends us a Callback confirming whether the Payment succeeded or failed.</li>
        <li>
          <strong>Only that Callback can mark your Payment as successful</strong> — your Ticket
          and Order status are never set to &quot;Paid&quot; based on what your browser reports,
          which protects both Customers and Organizers from manipulated or spoofed payment
          confirmations.
        </li>
        <li>
          On success, your QR-code Ticket(s) are generated immediately and become available under
          &quot;My Tickets&quot;.
        </li>
      </ol>

      <h2>4. Payment statuses</h2>
      <ul>
        <li><strong>Pending</strong> — Payment has been initiated and we are awaiting confirmation.</li>
        <li><strong>Success</strong> — Payment confirmed by the payment provider; Tickets are issued.</li>
        <li>
          <strong>Failed</strong> — Payment was not completed, for example due to insufficient
          funds, PIN entry cancellation, or timeout; any reserved Tickets are released back into
          inventory.
        </li>
        <li><strong>Cancelled</strong> — the Payment attempt was cancelled before completion.</li>
      </ul>

      <h2>5. Order statuses</h2>
      <ul>
        <li><strong>Pending</strong> — Order created, awaiting successful Payment.</li>
        <li><strong>Paid</strong> — Payment confirmed; Tickets issued.</li>
        <li><strong>Failed</strong> — Payment did not succeed; the Order did not result in a sale.</li>
        <li><strong>Cancelled</strong> — Order cancelled before or instead of Payment.</li>
      </ul>

      <h2>6. Platform Commission</h2>
      <p>
        TicketFlow Kenya charges a Platform Service Fee on each Order —{' '}
        <strong>nine per cent (9%) of the ticket price by default</strong> — added on top of the
        ticket price and paid by the buyer at checkout. The full ticket price, the Organizer
        Earning, is recorded against the Organizer&apos;s account. The fee is charged
        only on completed, successful sales; there is <strong>no charge</strong> on pending,
        failed, or cancelled Orders. Any future change to the default commission rate will be
        communicated to Organizers in advance and will apply only to new sales made after the
        change takes effect.
      </p>

      <h2>7. Currency and pricing</h2>
      <p>
        All prices on the Platform are listed and charged in <strong>Kenyan Shillings
        (KES)</strong> unless stated otherwise. Organizers are solely responsible for setting
        accurate ticket prices, including any applicable taxes they are required to account for
        under Kenyan law.
      </p>

      <h2>8. Failed and pending payments</h2>
      <p>
        If an M-Pesa prompt times out, is cancelled, or fails, the Order is marked{' '}
        <strong>Failed</strong> and any reserved ticket stock is automatically released so other
        Customers may purchase it. You may simply attempt the purchase again. If you were charged
        by M-Pesa but your Order still shows as Pending or Failed after a reasonable time, contact
        us immediately at <strong>payments@ticketflow.co.ke</strong> with your M-Pesa transaction
        message so we can investigate.
      </p>

      <h2>9. Refunds</h2>
      <p>
        Refund eligibility depends on the circumstances of the Order — see our{' '}
        <a href="/legal/ticket-purchase-policy">Ticket Purchase Policy</a> for full details. In
        summary:
      </p>
      <ul>
        <li>
          If an Event is cancelled by its Organizer and is not rescheduled, affected Ticket
          holders are entitled to a refund.
        </li>
        <li>
          We do not process card or M-Pesa chargebacks directly; approved refunds are issued back
          to the original payment method, for example the M-Pesa number used, where technically
          possible.
        </li>
        <li>
          Refunds are <strong>not available</strong> simply because a Customer changes their mind,
          except where required by Kenyan consumer protection law.
        </li>
      </ul>

      <h2>10. Disputes and chargebacks</h2>
      <p>
        If you believe you were charged in error, contact us first at{' '}
        <strong>payments@ticketflow.co.ke</strong> with your Order number and M-Pesa transaction
        code so that we can investigate using our payment and audit records. We aim to resolve
        Payment disputes within <strong>fourteen (14) business days</strong> of receiving a
        complete report.
      </p>

      <h2>11. Organizer payouts</h2>
      <p>
        Organizer Earnings accrue against the Organizer&apos;s account as sales are confirmed.
        Payout schedules, methods, and any minimum payout thresholds will be communicated
        separately to Organizers and may evolve as the Platform grows; see our{' '}
        <a href="/legal/event-organizer-policy">Event Organizer Policy</a> for further detail.
      </p>

      <h2>12. Anti-fraud and compliance</h2>
      <p>
        We reserve the right to delay, hold, or decline a Payment, Order, or payout where we
        reasonably suspect fraud, money laundering, or a violation of these Policies or applicable
        law, including any obligations under Kenyan anti-money-laundering legislation. Where
        practicable, we will notify the affected User and the reason for the action taken.
      </p>

      <h2>13. Security</h2>
      <p>
        We do not store M-Pesa PINs, card numbers, or card CVV codes. Payment confirmations are
        received only over secure, authenticated Callbacks from our payment providers. Sensitive
        payment events are recorded in an internal audit log for fraud detection and dispute
        resolution purposes.
      </p>

      <h2>14. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by Kenyan law, TicketFlow Kenya is not liable for delays
        or failures in Payment processing caused by a third-party payment provider, including
        Safaricom Daraja, network outages, or events beyond our reasonable control.
      </p>

      <h2>15. Changes to this Policy</h2>
      <p>
        We may update this Payment Policy as we add new payment methods or as regulatory
        requirements change. The version of this Policy in force at the time of a transaction
        applies to that transaction.
      </p>

      <h2>16. Contact us</h2>
      <p>
        For Payment queries, contact <strong>payments@ticketflow.co.ke</strong>.
      </p>
    </LegalLayout>
  );
}
