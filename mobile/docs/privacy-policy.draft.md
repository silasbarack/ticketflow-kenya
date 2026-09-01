# Privacy Policy — TicketFlow Kenya mobile application

> **DRAFT — not yet published.** This document has not been reviewed by a lawyer
> and is not wired into the app. It describes the data practices of the mobile
> application as actually implemented at the time of writing (see
> "Accuracy notes" at the end, which is working commentary to delete before
> publishing). Reconcile it with the website Privacy Policy at
> `frontend/app/legal/privacy-policy/page.tsx` before either goes live.

**Effective date:** _[to be set on publication]_

---

**TicketFlow Kenya** ("**TicketFlow Kenya**", "**we**", "**us**", or "**our**")
is committed to protecting the privacy and personal data of every person who
uses our mobile application. This Privacy Policy (the "**Policy**") is a formal,
institution-level statement of the data protection practices that apply
specifically to the **TicketFlow Kenya mobile application for Android and iOS**
(the "**App**"), including the personal data the App collects, the permissions it
requests from your device, what it stores on your device, and the rights
available to you under Kenyan law.

The App is one part of the TicketFlow Kenya platform, which also comprises our
website, our application programming interfaces, and related services
(collectively, the "**Platform**"). Where this Policy and our general
[Privacy Policy](https://ticketflow.co.ke/legal/privacy-policy) both apply, this
Policy governs matters specific to the App, and the general Privacy Policy
governs everything else. Both are read together.

We process personal data in accordance with the **Data Protection Act, 2019**
(Kenya), the **Data Protection (General) Regulations, 2021**, and any successor
or amending legislation (together, the "**Data Protection Laws**"). By
installing or using the App, you confirm that you have read, understood, and
accept this Policy. If you do not agree with any part of this Policy, you must
not use the App.

## 1. Definitions and Interpretation

Capitalised terms not defined below have the meaning given to them in our
general [Privacy Policy](https://ticketflow.co.ke/legal/privacy-policy) and our
[Terms and Conditions](https://ticketflow.co.ke/legal/terms-and-conditions).

- **"App"** means the TicketFlow Kenya mobile application for Android and iOS,
  including any development, preview, or pre-release variant of it.
- **"Device"** means the mobile phone or tablet on which the App is installed.
- **"Device Permission"** means an operating-system-level authorisation, such as
  camera access, that the App must request from you and that you may grant or
  refuse.
- **"Local Storage"** means storage areas on your Device that the App writes to,
  including the operating system's encrypted credential store and the App's
  cache directory.
- **"Ticket Code"** means the unique alphanumeric identifier and accompanying QR
  code generated for each Ticket.
- **"Check-in"** means the act of scanning or manually validating a Ticket at an
  Event's point of entry.

Headings are for convenience only and do not affect interpretation. A reference
to legislation includes that legislation as amended, re-enacted, or replaced from
time to time. The word "including" means "including, without limitation".

## 2. Who this Policy applies to

This Policy applies to every person who installs and uses the App, in any of the
roles the Platform supports:

- **Customers** — people who browse Events, purchase Tickets, and hold e-Tickets
  in the App.
- **Event Organizers and their authorised gate staff** — people who use the
  App's scanner to Check-in Attendees at an Event.
- **Administrators** — TicketFlow Kenya personnel who access the App in a
  moderation capacity.

Each role may be subject to different Processing activities, as described below.

## 3. Information we collect through the App

### 3.1 Information you give us directly

- **Account details** — your full name, email address, phone number, and
  password, provided when you register or log in. Your password is transmitted to
  our servers for authentication and is stored there only as a salted,
  irreversible cryptographic hash. **The App never stores your password on your
  Device.**
- **Order and attendee details** — the Tickets you select, and the name, email
  address, and phone number of each Attendee where an Order requires per-attendee
  details.
- **Payment details** — the M-Pesa phone number you enter at checkout. This is
  transmitted to our backend, which initiates the M-Pesa STK Push on your behalf.
  **The App never asks for, receives, or transmits your M-Pesa PIN**, which you
  enter only on your own Device in Safaricom's own prompt.
- **Support communications** — anything you voluntarily tell us when you contact
  us for help from within the App.

### 3.2 Information collected automatically

When the App communicates with our servers, our backend receives the technical
information inherent in any internet request, including your IP address and the
approximate geographic region it implies, together with the date, time, and
nature of the request. We also record server-side logs of authentication,
payment, and Check-in events, as described in Section 9.

**The App itself contains no analytics, advertising, attribution, crash-reporting,
or behavioural tracking software.** It does not build a usage profile of you, and
it does not report which Events you browse or search for to any third party.

### 3.3 Information from payment processing

When you pay via M-Pesa, Safaricom's Daraja platform sends a payment confirmation
**to our backend**, not to the App, containing the M-Pesa receipt number, the
phone number used, the amount paid, and a success or failure result code. The App
learns the outcome only by asking our backend for the status of your own Order.
We do not receive, process, or store M-Pesa PINs, and we never have access to
your mobile money account credentials.

### 3.4 Information we do **not** collect

For the avoidance of doubt, the App does not request, access, collect, or
transmit any of the following:

- Your device location, whether precise or coarse. The App requests no location
  permission.
- Your contacts, calendar, call logs, SMS messages, or microphone.
- Your photo library or any file on your Device other than the ticket documents
  the App itself has saved.
- Any advertising identifier, and it does not participate in any advertising or
  cross-app tracking network.
- Health, biometric, financial account, or other special-category data.

## 4. Device Permissions

The App requests exactly **one** Device Permission:

- **Camera** — requested only when you open the ticket scanner, which is
  available to Event Organizers and their authorised gate staff. The camera is
  used solely to read Ticket QR codes at an Event gate.

How the camera is used, precisely:

- The camera preview is decoded **on your Device**. The App reads QR codes only;
  it does not read any other barcode format.
- **No photograph, video, or camera frame is ever saved to your Device or
  transmitted to us or anyone else.** Only the decoded Ticket Code, together with
  the identifier of the Event being scanned, is sent to our servers to validate
  the Ticket.
- The camera is active only while the scanner screen is open.
- You may refuse or later revoke this permission in your Device's settings. If
  you do, the scanner will not function, but every other part of the App will
  continue to work normally.

If the App ever requires an additional Device Permission, we will explain why at
the point of the request and update this Policy before that version is released.

## 5. What the App stores on your Device

| What | Where | Why | Removed when |
| --- | --- | --- | --- |
| Your login token | The operating system's encrypted credential store (Android Keystore / iOS Keychain) | Keeps you signed in between sessions | You log out, your session expires, or you uninstall the App |
| A cached copy of your basic profile (name, email, phone, role) | The same encrypted credential store | Shows your profile immediately at startup without a network round trip | As above |
| Ticket documents you have downloaded | The App's private cache directory on your Device | Lets you open and share your Ticket | You clear the App's cache or storage, or uninstall the App |
| Event poster images | The App's private image cache | Avoids re-downloading artwork you have already seen | As above |

This data is held in the App's own private storage area, which the operating
system isolates from other applications. Logging out clears your stored token and
cached profile. Uninstalling the App removes everything in the table above from
your Device; it does not delete your Account or your Tickets from our servers,
for which see Section 11.

## 6. Sharing a Ticket from the App

The App lets you share a downloaded Ticket using your Device's standard share
sheet. If you use it, **you** are choosing to disclose that document — which
contains your name, the Event details, and a valid Ticket Code — to whichever
app, service, or person you select. That transfer happens between your Device and
the recipient you choose; it does not pass through us, and we cannot recall it.

Treat a Ticket Code as you would cash: anyone holding a valid, unused code may be
able to use it to gain entry.

## 7. Lawful basis for Processing

We rely on one or more of the following lawful bases under the Data Protection
Act, 2019, depending on the Processing activity:

- **Performance of a contract** — to create your Account, process your Order,
  issue your Ticket, and admit you to an Event.
- **Consent** — for Device Permissions, which the operating system requires you
  to grant explicitly and which you may withdraw at any time in your Device
  settings.
- **Legal obligation** — to comply with tax, accounting, and regulatory
  requirements applicable in Kenya.
- **Legitimate interests** — to detect and prevent Ticket fraud, secure the
  Platform, and keep the App working correctly, balanced against your rights and
  freedoms.

## 8. How we use information collected through the App

- To create and manage your Account and keep you signed in securely.
- To process Ticket Orders, initiate M-Pesa STK Push requests, and report payment
  status back to you.
- To generate, display, and deliver your QR-code e-Tickets.
- To validate Tickets at Event Check-in and to reject duplicate or invalid ones.
- To show you notifications about your own Orders, Tickets, and Events, which the
  App retrieves from our servers when you open it.
- To detect and prevent fraud, duplicate Ticket use, and abuse of the Platform.
- To provide support when you contact us.
- To comply with legal, tax, and regulatory obligations in Kenya.

**We do not sell your personal data**, and we do not use it for purposes
incompatible with those described in this Policy without first notifying you and,
where required, obtaining your consent.

## 9. Who we share information with

- **Event Organizers**, limited to attendee data (name, email, phone, ticket
  type, Check-in status) for Events to which you hold a Ticket. Organizers cannot
  see data for Events they did not create.
- **Safaricom (M-Pesa Daraja)**, our payment partner, to initiate and confirm
  payments. This exchange happens between our backend and Safaricom.
- **Service providers** who host our infrastructure, acting as Data Processors
  under confidentiality and data protection obligations.
- **The app store operator** from which you installed the App — Google Play or
  the Apple App Store — which independently collects installation and, if you
  submit one, review data under **its own** privacy policy, not this one.
- **Our build and distribution provider**, Expo Application Services, which
  compiles and distributes builds of the App. It processes developer and build
  metadata, not your Account data.
- **Regulators and law enforcement**, including the Office of the Data Protection
  Commissioner, where required by Kenyan law, a valid court order, or to protect
  the rights, property, or safety of TicketFlow Kenya, our users, or the public.
- **Successors**, in the event of a merger, acquisition, or sale of assets,
  subject to equivalent privacy protections being maintained.

## 10. International data transfers

Where our service providers process personal data outside Kenya, we take
reasonable steps to ensure such transfers comply with the Data Protection Act,
2019, including verifying that the recipient jurisdiction or organisation
provides an adequate level of data protection, or that appropriate contractual
safeguards are in place.

## 11. Data retention

Data held **on your Device** is retained as set out in the table in Section 5 and
is removed when you log out or uninstall the App.

Data held **on our servers** is retained for as long as your Account is active
and for a reasonable period afterwards to meet our legal, accounting, audit, and
fraud-prevention obligations. Event and Ticket records relating to completed
transactions are retained for at least **seven (7) years** to comply with Kenyan
tax record-keeping requirements. Where personal data is no longer necessary for
these purposes, we securely delete or anonymise it.

**Uninstalling the App does not delete your Account.** To request deletion of your
Account and the personal data we hold about you, use the "Request account
deletion" option in the App's Profile screen, or contact us using the details in
Section 16.

## 12. Your rights as a Data Subject

Under the Data Protection Act, 2019, you have the right to:

- **Be informed** of how your personal data is used, as set out in this Policy.
- **Access** the personal data we hold about you.
- **Rectification** — request correction of inaccurate or outdated data.
- **Erasure** — request deletion of your data, subject to our legal retention
  obligations.
- **Restriction and objection** — object to or restrict certain Processing.
- **Data portability**, where technically feasible.
- **Withdraw a Device Permission** at any time in your Device settings, without
  affecting the lawfulness of Processing carried out before withdrawal.
- **Lodge a complaint** with the Office of the Data Protection Commissioner,
  Kenya.

To exercise any of these rights, contact us using the details in Section 16. We
will respond within the timelines required by the Data Protection Laws.

## 13. Automated decision-making

Certain fraud-detection safeguards operate automatically — most visibly, the
automatic rejection of a second scan of an already-used Ticket. These safeguards
are narrow and rules-based, and do not produce legal effects of the kind
requiring a right to human review under the Data Protection Laws. You may
nonetheless contact us if you believe an automated safeguard has produced an
incorrect result at a gate.

## 14. Security

- Your login token and cached profile are held in the operating system's
  encrypted credential store, not in ordinary application storage.
- Communication between the App and our servers takes place over **HTTPS**.
- Passwords are hashed with bcrypt server-side and are never stored on your
  Device.
- If your session expires or is revoked, the App clears its stored credentials
  and returns you to the login screen.
- Access to Organizer and administrative functions is restricted by role-based
  access control.
- Sensitive Account, payment, and Check-in actions are written to an internal
  audit log.
- Payment status can only be set by our backend in response to a verified
  Safaricom callback. **It is never set by the App**, so a modified or
  impersonated app cannot mark a Ticket as paid.

No system is completely secure, but we take reasonable, industry-appropriate
technical and organisational measures to protect your data, and review them
periodically.

## 15. Children's privacy

The App is not directed at, and is not intended for use by, children under the
age of eighteen (18). We do not knowingly collect personal data from children. If
you believe a child has provided us with personal data, contact us immediately so
we can investigate and delete it.

## 16. Contact us

Questions, requests, or complaints about this Policy or about how the App handles
your data can be sent to **privacy@ticketflow.co.ke**. For help with an Order or
a Ticket, contact **support@ticketflow.co.ke**. You may also lodge a complaint
directly with the Office of the Data Protection Commissioner, Kenya.

## 17. Changes to this Policy

We may update this Policy to reflect changes to the App, our practices, or the
law — in particular if a future version requests a new Device Permission or
introduces push notifications. We will publish the updated version with a new
effective date and, where changes are material, give additional notice, for
example by email or an in-app notice. Continued use of the App after an update
constitutes acceptance of the revised Policy.

---

## Accuracy notes (delete before publishing)

Each claim above was checked against the code as it stands. Points that need a
decision or that will go stale:

1. **Push notifications.** The App has a Notifications tab, but it fetches a list
   from `GET /notifications` — there is no `expo-notifications` dependency and no
   push token is ever created or sent. The draft therefore says notifications are
   retrieved "when you open it". **If push is added later, Sections 3, 8, and 17
   must change before that build ships**, and Google Play's Data Safety form will
   need updating too.

2. **HTTPS (Section 14).** True for preview and production builds, which are
   release variants and reject cleartext. The development build permits plain
   HTTP so it can reach a LAN backend (`.env.example:18-20`). The claim is
   correct for any build a member of the public can install; it is not correct
   for the dev build on your machine.

3. **Email addresses — resolved.** `@ticketflow.co.ke` is the real domain. The
   App's Profile screen previously used `@ticketflowkenya.co.ke` for help and
   account deletion; both were changed to `support@ticketflow.co.ke`. The whole
   app and all policy text now agree.

4. **Account deletion (Section 11)** describes the Profile screen's existing
   flow, which raises an alert telling the user to email support. If a
   self-service delete endpoint is added, reword this.

5. **`expo-secure-store` on Android** uses the Android Keystore; on iOS, the
   Keychain. "Encrypted credential store" covers both without over-claiming.

6. **Development and preview variants** (`app.config.js`) install as separate
   apps with `.dev` / `.preview` package suffixes. They are internal testing
   artefacts, so this draft deliberately says nothing about them. If you ever
   distribute a preview build outside your own team, that needs a sentence.

7. **Scope overlap.** This is written as an App-specific policy that sits
   *alongside* the website policy. The alternative is to fold the App into the
   single existing policy by widening its "Platform" definition. Choosing the
   second option would make most of this draft redundant — decide before
   publishing either.

8. **Google Play Data Safety.** This draft is the source material for that form,
   not a substitute. On current behaviour the declarations would be: collects
   name, email, phone, purchase history; no data shared for advertising; no
   tracking; data encrypted in transit; deletion available on request.