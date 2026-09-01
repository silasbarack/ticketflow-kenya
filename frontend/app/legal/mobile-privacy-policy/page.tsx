import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Mobile App Privacy Policy | TicketFlow Kenya' };

export default function MobilePrivacyPolicyPage() {
  return (
    <LegalLayout title="Mobile App Privacy Policy" effectiveDate="To be confirmed">
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Draft</strong> — this document is under review and is not yet in force.
      </div>

      <p>
        <strong>TicketFlow Kenya</strong> (&quot;<strong>TicketFlow Kenya</strong>&quot;,
        &quot;<strong>we</strong>&quot;, &quot;<strong>us</strong>&quot;, or &quot;
        <strong>our</strong>&quot;) is committed to protecting the privacy and personal data of
        every person who uses our mobile application. This Privacy Policy (the &quot;
        <strong>Policy</strong>&quot;) is a formal, institution-level statement of the data
        protection practices that apply specifically to the{' '}
        <strong>TicketFlow Kenya mobile application for Android and iOS</strong> (the &quot;
        <strong>App</strong>&quot;), including the personal data the App collects, the permissions
        it requests from your device, what it stores on your device, and the rights available to
        you under Kenyan law.
      </p>
      <p>
        The App is one part of the TicketFlow Kenya platform, which also comprises our website, our
        application programming interfaces, and related services (collectively, the &quot;
        <strong>Platform</strong>&quot;). Where this Policy and our general{' '}
        <a href="/legal/privacy-policy">Privacy Policy</a> both apply, this Policy governs matters
        specific to the App, and the general Privacy Policy governs everything else. Both are read
        together.
      </p>
      <p>
        We process personal data in accordance with the <strong>Data Protection Act, 2019</strong>{' '}
        (Kenya), the <strong>Data Protection (General) Regulations, 2021</strong>, and any successor
        or amending legislation (together, the &quot;<strong>Data Protection Laws</strong>&quot;). By
        installing or using the App, you confirm that you have read, understood, and accept this
        Policy. If you do not agree with any part of this Policy, you must not use the App.
      </p>

      <h2>1. Definitions and Interpretation</h2>
      <p>
        Capitalised terms not defined below have the meaning given to them in our general{' '}
        <a href="/legal/privacy-policy">Privacy Policy</a> and our{' '}
        <a href="/legal/terms-and-conditions">Terms and Conditions</a>.
      </p>
      <ul>
        <li>
          <strong>&quot;App&quot;</strong> means the TicketFlow Kenya mobile application for Android
          and iOS, including any development, preview, or pre-release variant of it.
        </li>
        <li>
          <strong>&quot;Device&quot;</strong> means the mobile phone or tablet on which the App is
          installed.
        </li>
        <li>
          <strong>&quot;Device Permission&quot;</strong> means an operating-system-level
          authorisation, such as camera access, that the App must request from you and that you may
          grant or refuse.
        </li>
        <li>
          <strong>&quot;Local Storage&quot;</strong> means storage areas on your Device that the App
          writes to, including the operating system&apos;s encrypted credential store and the
          App&apos;s cache directory.
        </li>
        <li>
          <strong>&quot;Ticket Code&quot;</strong> means the unique alphanumeric identifier and
          accompanying QR code generated for each Ticket.
        </li>
        <li>
          <strong>&quot;Check-in&quot;</strong> means the act of scanning or manually validating a
          Ticket at an Event&apos;s point of entry.
        </li>
      </ul>
      <p>
        Headings are for convenience only and do not affect interpretation. A reference to
        legislation includes that legislation as amended, re-enacted, or replaced from time to time.
        The word &quot;including&quot; means &quot;including, without limitation&quot;.
      </p>

      <h2>2. Who this Policy applies to</h2>
      <p>
        This Policy applies to every person who installs and uses the App, in any of the roles the
        Platform supports:
      </p>
      <ul>
        <li>
          <strong>Customers</strong> — people who browse Events, purchase Tickets, and hold
          e-Tickets in the App.
        </li>
        <li>
          <strong>Event Organizers and their authorised gate staff</strong> — people who use the
          App&apos;s scanner to Check-in Attendees at an Event.
        </li>
        <li>
          <strong>Administrators</strong> — TicketFlow Kenya personnel who access the App in a
          moderation capacity.
        </li>
      </ul>
      <p>Each role may be subject to different Processing activities, as described below.</p>

      <h2>3. Information we collect through the App</h2>
      <h3>3.1 Information you give us directly</h3>
      <ul>
        <li>
          <strong>Account details</strong> — your full name, email address, phone number, and
          password, provided when you register or log in. Your password is transmitted to our
          servers for authentication and is stored there only as a salted, irreversible
          cryptographic hash. <strong>The App never stores your password on your Device.</strong>
        </li>
        <li>
          <strong>Order and attendee details</strong> — the Tickets you select, and the name, email
          address, and phone number of each Attendee where an Order requires per-attendee details.
        </li>
        <li>
          <strong>Payment details</strong> — the M-Pesa phone number you enter at checkout. This is
          transmitted to our backend, which initiates the M-Pesa STK Push on your behalf.{' '}
          <strong>The App never asks for, receives, or transmits your M-Pesa PIN</strong>, which you
          enter only on your own Device in Safaricom&apos;s own prompt.
        </li>
        <li>
          <strong>Support communications</strong> — anything you voluntarily tell us when you
          contact us for help from within the App.
        </li>
      </ul>
      <h3>3.2 Information collected automatically</h3>
      <p>
        When the App communicates with our servers, our backend receives the technical information
        inherent in any internet request, including your IP address and the approximate geographic
        region it implies, together with the date, time, and nature of the request. We also record
        server-side logs of authentication, payment, and Check-in events, as described in Section
        14.
      </p>
      <p>
        <strong>
          The App itself contains no analytics, advertising, attribution, crash-reporting, or
          behavioural tracking software.
        </strong>{' '}
        It does not build a usage profile of you, and it does not report which Events you browse or
        search for to any third party.
      </p>
      <h3>3.3 Information from payment processing</h3>
      <p>
        When you pay via M-Pesa, Safaricom&apos;s Daraja platform sends a payment confirmation{' '}
        <strong>to our backend</strong>, not to the App, containing the M-Pesa receipt number, the
        phone number used, the amount paid, and a success or failure result code. The App learns the
        outcome only by asking our backend for the status of your own Order. We do not receive,
        process, or store M-Pesa PINs, and we never have access to your mobile money account
        credentials.
      </p>
      <h3>3.4 Information we do not collect</h3>
      <p>
        For the avoidance of doubt, the App does not request, access, collect, or transmit any of
        the following:
      </p>
      <ul>
        <li>
          Your device location, whether precise or coarse. The App requests no location permission.
        </li>
        <li>Your contacts, calendar, call logs, SMS messages, or microphone.</li>
        <li>
          Your photo library or any file on your Device other than the ticket documents the App
          itself has saved.
        </li>
        <li>
          Any advertising identifier, and it does not participate in any advertising or cross-app
          tracking network.
        </li>
        <li>Health, biometric, financial account, or other special-category data.</li>
      </ul>

      <h2>4. Device Permissions</h2>
      <p>
        The App requests exactly <strong>one</strong> Device Permission:
      </p>
      <ul>
        <li>
          <strong>Camera</strong> — requested only when you open the ticket scanner, which is
          available to Event Organizers and their authorised gate staff. The camera is used solely
          to read Ticket QR codes at an Event gate.
        </li>
      </ul>
      <p>How the camera is used, precisely:</p>
      <ul>
        <li>
          The camera preview is decoded <strong>on your Device</strong>. The App reads QR codes
          only; it does not read any other barcode format.
        </li>
        <li>
          <strong>
            No photograph, video, or camera frame is ever saved to your Device or transmitted to us
            or anyone else.
          </strong>{' '}
          Only the decoded Ticket Code, together with the identifier of the Event being scanned, is
          sent to our servers to validate the Ticket.
        </li>
        <li>The camera is active only while the scanner screen is open.</li>
        <li>
          You may refuse or later revoke this permission in your Device&apos;s settings. If you do,
          the scanner will not function, but every other part of the App will continue to work
          normally.
        </li>
      </ul>
      <p>
        If the App ever requires an additional Device Permission, we will explain why at the point of
        the request and update this Policy before that version is released.
      </p>

      <h2>5. What the App stores on your Device</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-300">
              <th className="py-2 pr-4 font-semibold text-gray-900">What</th>
              <th className="py-2 pr-4 font-semibold text-gray-900">Where</th>
              <th className="py-2 pr-4 font-semibold text-gray-900">Why</th>
              <th className="py-2 font-semibold text-gray-900">Removed when</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            <tr className="border-b border-gray-200">
              <td className="py-2 pr-4">Your login token</td>
              <td className="py-2 pr-4">
                The operating system&apos;s encrypted credential store (Android Keystore / iOS
                Keychain)
              </td>
              <td className="py-2 pr-4">Keeps you signed in between sessions</td>
              <td className="py-2">
                You log out, your session expires, or you uninstall the App
              </td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 pr-4">
                A cached copy of your basic profile (name, email, phone, role)
              </td>
              <td className="py-2 pr-4">The same encrypted credential store</td>
              <td className="py-2 pr-4">
                Shows your profile immediately at startup without a network round trip
              </td>
              <td className="py-2">As above</td>
            </tr>
            <tr className="border-b border-gray-200">
              <td className="py-2 pr-4">Ticket documents you have downloaded</td>
              <td className="py-2 pr-4">The App&apos;s private cache directory on your Device</td>
              <td className="py-2 pr-4">Lets you open and share your Ticket</td>
              <td className="py-2">
                You clear the App&apos;s cache or storage, or uninstall the App
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4">Event poster images</td>
              <td className="py-2 pr-4">The App&apos;s private image cache</td>
              <td className="py-2 pr-4">Avoids re-downloading artwork you have already seen</td>
              <td className="py-2">As above</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        This data is held in the App&apos;s own private storage area, which the operating system
        isolates from other applications. Logging out clears your stored token and cached profile.
        Uninstalling the App removes everything in the table above from your Device; it does not
        delete your Account or your Tickets from our servers, for which see Section 11.
      </p>

      <h2>6. Sharing a Ticket from the App</h2>
      <p>
        The App lets you share a downloaded Ticket using your Device&apos;s standard share sheet. If
        you use it, <strong>you</strong> are choosing to disclose that document — which contains your
        name, the Event details, and a valid Ticket Code — to whichever app, service, or person you
        select. That transfer happens between your Device and the recipient you choose; it does not
        pass through us, and we cannot recall it.
      </p>
      <p>
        Treat a Ticket Code as you would cash: anyone holding a valid, unused code may be able to use
        it to gain entry.
      </p>

      <h2>7. Lawful basis for Processing</h2>
      <p>
        We rely on one or more of the following lawful bases under the Data Protection Act, 2019,
        depending on the Processing activity:
      </p>
      <ul>
        <li>
          <strong>Performance of a contract</strong> — to create your Account, process your Order,
          issue your Ticket, and admit you to an Event.
        </li>
        <li>
          <strong>Consent</strong> — for Device Permissions, which the operating system requires you
          to grant explicitly and which you may withdraw at any time in your Device settings.
        </li>
        <li>
          <strong>Legal obligation</strong> — to comply with tax, accounting, and regulatory
          requirements applicable in Kenya.
        </li>
        <li>
          <strong>Legitimate interests</strong> — to detect and prevent Ticket fraud, secure the
          Platform, and keep the App working correctly, balanced against your rights and freedoms.
        </li>
      </ul>

      <h2>8. How we use information collected through the App</h2>
      <ul>
        <li>To create and manage your Account and keep you signed in securely.</li>
        <li>
          To process Ticket Orders, initiate M-Pesa STK Push requests, and report payment status back
          to you.
        </li>
        <li>To generate, display, and deliver your QR-code e-Tickets.</li>
        <li>To validate Tickets at Event Check-in and to reject duplicate or invalid ones.</li>
        <li>
          To show you notifications about your own Orders, Tickets, and Events, which the App
          retrieves from our servers when you open it.
        </li>
        <li>To detect and prevent fraud, duplicate Ticket use, and abuse of the Platform.</li>
        <li>To provide support when you contact us.</li>
        <li>To comply with legal, tax, and regulatory obligations in Kenya.</li>
      </ul>
      <p>
        <strong>We do not sell your personal data</strong>, and we do not use it for purposes
        incompatible with those described in this Policy without first notifying you and, where
        required, obtaining your consent.
      </p>

      <h2>9. Who we share information with</h2>
      <ul>
        <li>
          <strong>Event Organizers</strong>, limited to attendee data (name, email, phone, ticket
          type, Check-in status) for Events to which you hold a Ticket. Organizers cannot see data
          for Events they did not create.
        </li>
        <li>
          <strong>Safaricom (M-Pesa Daraja)</strong>, our payment partner, to initiate and confirm
          payments. This exchange happens between our backend and Safaricom.
        </li>
        <li>
          <strong>Service providers</strong> who host our infrastructure, acting as Data Processors
          under confidentiality and data protection obligations.
        </li>
        <li>
          <strong>The app store operator</strong> from which you installed the App — Google Play or
          the Apple App Store — which independently collects installation and, if you submit one,
          review data under <strong>its own</strong> privacy policy, not this one.
        </li>
        <li>
          <strong>Our build and distribution provider</strong>, Expo Application Services, which
          compiles and distributes builds of the App. It processes developer and build metadata, not
          your Account data.
        </li>
        <li>
          <strong>Regulators and law enforcement</strong>, including the Office of the Data
          Protection Commissioner, where required by Kenyan law, a valid court order, or to protect
          the rights, property, or safety of TicketFlow Kenya, our users, or the public.
        </li>
        <li>
          <strong>Successors</strong>, in the event of a merger, acquisition, or sale of assets,
          subject to equivalent privacy protections being maintained.
        </li>
      </ul>

      <h2>10. International data transfers</h2>
      <p>
        Where our service providers process personal data outside Kenya, we take reasonable steps to
        ensure such transfers comply with the Data Protection Act, 2019, including verifying that
        the recipient jurisdiction or organisation provides an adequate level of data protection, or
        that appropriate contractual safeguards are in place.
      </p>

      <h2>11. Data retention</h2>
      <p>
        Data held <strong>on your Device</strong> is retained as set out in the table in Section 5
        and is removed when you log out or uninstall the App.
      </p>
      <p>
        Data held <strong>on our servers</strong> is retained for as long as your Account is active
        and for a reasonable period afterwards to meet our legal, accounting, audit, and
        fraud-prevention obligations. Event and Ticket records relating to completed transactions are
        retained for at least <strong>seven (7) years</strong> to comply with Kenyan tax
        record-keeping requirements. Where personal data is no longer necessary for these purposes,
        we securely delete or anonymise it.
      </p>
      <p>
        <strong>Uninstalling the App does not delete your Account.</strong> To request deletion of
        your Account and the personal data we hold about you, use the &quot;Request account
        deletion&quot; option in the App&apos;s Profile screen, or contact us using the details in
        Section 16.
      </p>

      <h2>12. Your rights as a Data Subject</h2>
      <p>Under the Data Protection Act, 2019, you have the right to:</p>
      <ul>
        <li>
          <strong>Be informed</strong> of how your personal data is used, as set out in this Policy.
        </li>
        <li>
          <strong>Access</strong> the personal data we hold about you.
        </li>
        <li>
          <strong>Rectification</strong> — request correction of inaccurate or outdated data.
        </li>
        <li>
          <strong>Erasure</strong> — request deletion of your data, subject to our legal retention
          obligations.
        </li>
        <li>
          <strong>Restriction and objection</strong> — object to or restrict certain Processing.
        </li>
        <li>
          <strong>Data portability</strong>, where technically feasible.
        </li>
        <li>
          <strong>Withdraw a Device Permission</strong> at any time in your Device settings, without
          affecting the lawfulness of Processing carried out before withdrawal.
        </li>
        <li>
          <strong>Lodge a complaint</strong> with the Office of the Data Protection Commissioner,
          Kenya.
        </li>
      </ul>
      <p>
        To exercise any of these rights, contact us using the details in Section 16. We will respond
        within the timelines required by the Data Protection Laws.
      </p>

      <h2>13. Automated decision-making</h2>
      <p>
        Certain fraud-detection safeguards operate automatically — most visibly, the automatic
        rejection of a second scan of an already-used Ticket. These safeguards are narrow and
        rules-based, and do not produce legal effects of the kind requiring a right to human review
        under the Data Protection Laws. You may nonetheless contact us if you believe an automated
        safeguard has produced an incorrect result at a gate.
      </p>

      <h2>14. Security</h2>
      <ul>
        <li>
          Your login token and cached profile are held in the operating system&apos;s encrypted
          credential store, not in ordinary application storage.
        </li>
        <li>
          Communication between the App and our servers takes place over <strong>HTTPS</strong>.
        </li>
        <li>
          Passwords are hashed with bcrypt server-side and are never stored on your Device.
        </li>
        <li>
          If your session expires or is revoked, the App clears its stored credentials and returns
          you to the login screen.
        </li>
        <li>
          Access to Organizer and administrative functions is restricted by role-based access
          control.
        </li>
        <li>
          Sensitive Account, payment, and Check-in actions are written to an internal audit log.
        </li>
        <li>
          Payment status can only be set by our backend in response to a verified Safaricom callback.{' '}
          <strong>It is never set by the App</strong>, so a modified or impersonated app cannot mark
          a Ticket as paid.
        </li>
      </ul>
      <p>
        No system is completely secure, but we take reasonable, industry-appropriate technical and
        organisational measures to protect your data, and review them periodically.
      </p>

      <h2>15. Children&apos;s privacy</h2>
      <p>
        The App is not directed at, and is not intended for use by, children under the age of
        eighteen (18). We do not knowingly collect personal data from children. If you believe a
        child has provided us with personal data, contact us immediately so we can investigate and
        delete it.
      </p>

      <h2>16. Contact us</h2>
      <p>
        Questions, requests, or complaints about this Policy or about how the App handles your data
        can be sent to <strong>privacy@ticketflow.co.ke</strong>. For help with an Order or a Ticket,
        contact <strong>support@ticketflow.co.ke</strong>. You may also lodge a complaint directly
        with the Office of the Data Protection Commissioner, Kenya.
      </p>

      <h2>17. Changes to this Policy</h2>
      <p>
        We may update this Policy to reflect changes to the App, our practices, or the law — in
        particular if a future version requests a new Device Permission or introduces push
        notifications. We will publish the updated version with a new effective date and, where
        changes are material, give additional notice, for example by email or an in-app notice.
        Continued use of the App after an update constitutes acceptance of the revised Policy.
      </p>
    </LegalLayout>
  );
}
