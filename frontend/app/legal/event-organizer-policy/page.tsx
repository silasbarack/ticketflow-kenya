import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Event Organizer Policy | TicketFlow Kenya' };

export default function EventOrganizerPolicyPage() {
  return (
    <LegalLayout title="Event Organizer Policy" effectiveDate="27 June 2026">
      <p>
        This Event Organizer Policy applies to anyone who registers on TicketFlow Kenya with an
        Organizer account to create, publish, and sell tickets to events. It forms part of our{' '}
        <a href="/legal/terms-and-conditions">Terms and Conditions</a>. By submitting an event for
        approval, you agree to this Policy in addition to our general Terms.
      </p>

      <h2>1. Becoming an Organizer</h2>
      <p>
        You register as an Organizer by selecting the Organizer role at sign-up and providing a
        company or brand name. We may request additional verification information before
        approving your first event or before enabling payouts, including a valid phone number,
        identification, or business registration details.
      </p>

      <h2>2. Event lifecycle</h2>
      <p>Every event you create moves through the following statuses:</p>
      <ul>
        <li><strong>Draft</strong> — visible only to you, fully editable, not yet submitted.</li>
        <li><strong>Pending Approval</strong> — submitted for review by a TicketFlow Kenya administrator.</li>
        <li><strong>Published</strong> — approved and visible to Customers; tickets can be sold.</li>
        <li><strong>Rejected</strong> — not approved, with a reason provided; you may edit and resubmit.</li>
        <li><strong>Cancelled</strong> — withdrawn by you or suspended by an administrator; no further sales.</li>
        <li><strong>Completed</strong> — the event date has passed.</li>
      </ul>
      <p>
        Editing a <strong>Published</strong> event's core details sends it back to{' '}
        <strong>Pending Approval</strong> so changes can be reviewed before they go live again.
      </p>

      <h2>3. Approval review</h2>
      <p>
        We review submitted events for, among other things: accuracy of information, prohibited
        or unlawful content, misleading pricing, safety concerns, and impersonation. Approval is
        granted at our reasonable discretion and is not a guarantee or endorsement of the event.
        We aim to review submissions promptly but do not guarantee a specific turnaround time.
      </p>

      <h2>4. Accuracy of your listing</h2>
      <p>You are responsible for ensuring that your event listing is accurate and not misleading, including:</p>
      <ul>
        <li>Correct date, time, venue, and address.</li>
        <li>An accurate description of what attendees will receive.</li>
        <li>Honest ticket type names, inclusions, and quantities available.</li>
        <li>A poster image you own or have the right to use.</li>
      </ul>

      <h2>5. Ticket types and pricing</h2>
      <p>
        You may create multiple ticket types per event (e.g. Regular, VIP, VVIP, Student, Early
        Bird), each with its own price and quantity. Once a ticket type has any completed sales,
        its quantity cannot be reduced below the number already sold, and it cannot be deleted —
        this protects Customers who have already purchased that ticket type. You may still add
        new ticket types or adjust quantities upward at any time before the event.
      </p>

      <h2>6. Your responsibilities as the seller of record</h2>
      <p>Unless we agree otherwise in writing, you, the Organizer, are responsible for:</p>
      <ul>
        <li>Actually holding the event as advertised, or promptly notifying TicketFlow Kenya and your attendees of any change, postponement, or cancellation.</li>
        <li>Complying with all applicable Kenyan laws, licences, and permits required to host your event (venue permits, county licences, copyright/performance licences, security, and safety requirements).</li>
        <li>The safety, conduct, and experience of attendees at your event.</li>
        <li>Honouring the ticket types and inclusions you advertised.</li>
        <li>Responding to attendee queries about your event in a timely manner.</li>
      </ul>

      <h2>7. Platform commission and earnings</h2>
      <p>
        TicketFlow Kenya charges a platform commission of <strong>7% of the ticket price by
        default</strong> on each successfully paid ticket. Your earning per ticket is the ticket
        price minus this commission. Commission rates and any future changes will be shown in your
        Organizer dashboard before they apply to new sales. See our{' '}
        <a href="/legal/payment-policy">Payment Policy</a> for how this is calculated and paid out.
      </p>

      <h2>8. Cancelling or postponing your event</h2>
      <p>
        If you need to cancel your event, use the &quot;Cancel Event&quot; action in your
        Organizer dashboard as soon as possible. Cancelling stops further sales. Where tickets
        have already been sold to a cancelled event, affected Customers are entitled to a refund
        as described in our <a href="/legal/ticket-purchase-policy">Ticket Purchase Policy</a>. If
        your event is postponed to a new confirmed date, existing tickets normally remain valid
        for the new date unless you state otherwise and we communicate this clearly to ticket
        holders.
      </p>

      <h2>9. Check-in and ticket scanning</h2>
      <p>
        You and anyone you authorize under your Organizer account may scan or manually validate
        tickets at the gate using the Platform's scanner tools. Each ticket can only be checked in
        once; the Platform automatically rejects a second check-in attempt and records who
        performed each check-in for audit purposes. You are responsible for the conduct of anyone
        you allow to use your scanning credentials.
      </p>

      <h2>10. Attendee data</h2>
      <p>
        You may view and export the attendee list (name, email, phone, ticket type, check-in
        status) for events you created, in order to manage entry and provide customer service.
        This data must only be used for purposes related to that event — it may not be sold,
        rented, or used for unrelated marketing without the attendee's consent, and must be
        handled in line with the Data Protection Act, 2019.
      </p>

      <h2>11. Suspension of events or accounts</h2>
      <p>
        We may suspend a published event or your Organizer account where we reasonably suspect
        fraud, a safety issue, a breach of this Policy, or non-compliance with the law. Where
        possible, we will explain the reason and give you an opportunity to respond.
      </p>

      <h2>12. Indemnity</h2>
      <p>
        You agree to indemnify and hold TicketFlow Kenya harmless from any claims, losses, or
        damages arising from your event, your conduct as an Organizer, or your breach of this
        Policy or applicable law.
      </p>

      <h2>13. Contact us</h2>
      <p>
        For Organizer support, including verification, payouts, or approval questions, contact{' '}
        <strong>organizers@ticketflow.co.ke</strong>.
      </p>
    </LegalLayout>
  );
}
