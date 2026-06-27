import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Ticket Purchase Policy | TicketFlow Kenya' };

export default function TicketPurchasePolicyPage() {
  return (
    <LegalLayout title="Ticket Purchase Policy" effectiveDate="27 June 2026">
      <p>
        This Ticket Purchase Policy explains how buying a ticket on TicketFlow Kenya works, what
        you are entitled to, and what happens if an event changes or is cancelled. It forms part
        of our <a href="/legal/terms-and-conditions">Terms and Conditions</a>.
      </p>

      <h2>1. Who you are buying from</h2>
      <p>
        When you buy a ticket, you are entering into a contract with the <strong>Event
        Organizer</strong>, who is responsible for the event itself. TicketFlow Kenya acts as the
        ticketing and payment platform that issues your ticket and processes your payment.
      </p>

      <h2>2. Placing an order</h2>
      <ol>
        <li>Select an event and choose one or more ticket types and quantities.</li>
        <li>We check availability and reserve your selected tickets so they cannot be sold to someone else while you complete payment.</li>
        <li>An order is created showing the total price, including the platform commission embedded in the ticket price.</li>
        <li>You complete payment, typically via M-Pesa STK Push — see our <a href="/legal/payment-policy">Payment Policy</a>.</li>
      </ol>
      <p>
        Reserved tickets are only guaranteed to you once your payment is confirmed successful. If
        payment fails, is cancelled, or times out, your reservation is released and the tickets
        become available to other Customers again.
      </p>

      <h2>3. Conditions that block a purchase</h2>
      <p>You will not be able to complete a purchase where, at the time of checkout:</p>
      <ul>
        <li>The event has been cancelled.</li>
        <li>The event has already taken place (marked Completed) or its start time has passed.</li>
        <li>The selected ticket type is sold out (requested quantity exceeds what remains available).</li>
      </ul>

      <h2>4. Your e-ticket</h2>
      <p>
        Once payment is confirmed, we generate a unique QR-code e-ticket for each ticket
        purchased, available under &quot;My Tickets&quot; and viewable/printable from its ticket
        page. Your e-ticket contains a unique ticket code and QR code — keep it confidential and
        do not share screenshots of it publicly, as anyone holding a valid, unused code may be
        able to use it to gain entry.
      </p>

      <h2>5. Entry and check-in</h2>
      <ul>
        <li>Present your e-ticket's QR code (or your ticket code, for manual check-in) at the event entrance.</li>
        <li><strong>Each ticket can only be used once.</strong> Once checked in, a ticket is marked &quot;Used&quot; and any further attempt to use it — including duplicates or screenshots shared with others — will be rejected.</li>
        <li>The exact time of check-in is recorded for the Organizer's records and for fraud prevention.</li>
        <li>You may be asked to present identification matching the name on the order, at the Organizer's discretion.</li>
      </ul>

      <h2>6. Ticket statuses</h2>
      <ul>
        <li><strong>Active</strong> — valid and not yet used.</li>
        <li><strong>Used</strong> — already checked in at the event gate.</li>
        <li><strong>Cancelled</strong> — voided, typically because the related event or order was cancelled.</li>
        <li><strong>Refunded</strong> — a refund was issued for this ticket; it is no longer valid for entry.</li>
      </ul>

      <h2>7. Changes of mind and transfers</h2>
      <p>
        Tickets are generally <strong>non-refundable and non-exchangeable</strong> once payment
        is successful, except as described in Section 8 below or as required by Kenyan consumer
        protection law. The Platform does not currently support transferring a ticket to another
        person's account; treat your ticket code and QR code as you would cash, and only share
        them with someone you intend to let use that specific ticket.
      </p>

      <h2>8. Cancelled or postponed events</h2>
      <ul>
        <li>
          <strong>If the Organizer cancels the event</strong> and does not reschedule it, you are
          entitled to a refund of the amount you paid for that order.
        </li>
        <li>
          <strong>If the event is postponed</strong> to a new confirmed date, your existing
          ticket(s) normally remain valid for the new date. If you cannot attend the new date, you
          may request a refund within the window communicated for that event.
        </li>
        <li>
          Refunds approved under this section are issued to the original payment method (e.g. the
          M-Pesa number used for the order) where technically possible, normally within 14
          business days of approval.
        </li>
      </ul>

      <h2>9. Disputed or failed entries</h2>
      <p>
        If you are wrongly refused entry with a valid, unused ticket, or if you believe your
        ticket was fraudulently used by someone else before you arrived, contact us immediately at{' '}
        <strong>support@ticketflow.co.ke</strong> with your ticket code and order number, and
        also raise it with the Organizer's staff at the venue. We will investigate using our
        check-in audit records, which show exactly when and by whom each ticket was scanned.
      </p>

      <h2>10. Accuracy of attendee details</h2>
      <p>
        You are responsible for providing accurate contact details (name, email, phone) at the
        time of registration, since this information is used to identify you as the ticket holder
        and to contact you about your order.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        TicketFlow Kenya is not responsible for the conduct, quality, or actual occurrence of an
        event, which remains the responsibility of the Organizer. Our role is limited to
        ticketing, payment processing, and check-in validation, as further described in our{' '}
        <a href="/legal/terms-and-conditions">Terms and Conditions</a>.
      </p>

      <h2>12. Contact us</h2>
      <p>
        For help with an order or ticket, contact <strong>support@ticketflow.co.ke</strong> with
        your order number or ticket code.
      </p>
    </LegalLayout>
  );
}
