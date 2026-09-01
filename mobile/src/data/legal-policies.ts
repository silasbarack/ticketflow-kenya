import type { LegalDocument, LegalSlug } from '@/types/legal';

/**
 * The six legal documents published on the TicketFlow Kenya website, imported
 * verbatim from `frontend/app/legal/*` so the app and the site say the same
 * thing. When a policy changes on the website, update it here too and bump
 * `effectiveDate`.
 */

const PRIVACY_POLICY: LegalDocument = {
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  shortTitle: 'Privacy Policy',
  icon: 'shield',
  effectiveDate: '29 June 2026',
  summary: 'What data we collect and your rights under Kenyan law',
  blocks: [
    { type: 'paragraph', text: `**TicketFlow Kenya** ("**TicketFlow Kenya**", "**we**", "**us**", or "**our**") is committed to protecting the privacy and personal data of every person who interacts with our platform. This Privacy Policy (the "**Policy**") is a formal, institution-level statement of our data protection practices. It explains, in detail, what personal data we collect, the lawful basis on which we collect and process it, how we use, store, and protect it, how long we retain it, who we share it with, and the rights available to you under Kenyan law. It applies to every Customer, Event Organizer, and Administrator who accesses our website, mobile-responsive web application, application programming interfaces, and related services (collectively, the "**Platform**").` },
    { type: 'paragraph', text: `We process personal data in accordance with the **Data Protection Act, 2019** (Kenya), the **Data Protection (General) Regulations, 2021**, and any successor or amending legislation (together, the "**Data Protection Laws**"). By accessing or using the Platform, you confirm that you have read, understood, and accept this Policy. If you do not agree with any part of this Policy, you must not use the Platform.` },

    { type: 'heading', text: '1. Definitions and Interpretation' },
    { type: 'paragraph', text: `For the purposes of this Policy, the following capitalised terms have the meanings set out below. Other capitalised terms not defined here have the meaning given to them in our [Terms and Conditions](terms-and-conditions).` },
    {
      type: 'bullets',
      items: [
        `**"Account"** means the registered user profile through which a person accesses the Platform as a Customer, Event Organizer, or Administrator.`,
        `**"Customer"** means any natural person who browses, searches for, or purchases a Ticket to an Event through the Platform.`,
        `**"Event Organizer"** or **"Organizer"** means any person or entity that registers an Organizer Account to create, publish, and sell Tickets to an Event, and to check in attendees.`,
        `**"Administrator"** means a member of TicketFlow Kenya personnel authorised to moderate Events, Users, and Payments on the Platform.`,
        `**"Data Subject"** means an identified or identifiable natural person whose Personal Data is processed by us, including Customers, Organizers, and Administrators.`,
        `**"Personal Data"** means any information relating to an identified or identifiable Data Subject, as defined under the Data Protection Act, 2019.`,
        `**"Processing"** means any operation performed on Personal Data, including collection, recording, storage, use, disclosure, and deletion.`,
        `**"Data Controller"** means TicketFlow Kenya, in its capacity as the entity that determines the purpose and means of Processing Personal Data collected through the Platform.`,
        `**"Data Processor"** means any third party that Processes Personal Data on our behalf and under our instructions, such as a hosting or payment provider.`,
        `**"Ticket"** means a digital, QR-code-bearing right of entry to an Event, issued upon successful payment of an Order.`,
        `**"Order"** means a request by a Customer to purchase one or more Tickets, together with the associated payment record.`,
        `**"ODPC"** means the Office of the Data Protection Commissioner of Kenya, the statutory regulator for data protection matters.`,
      ],
    },
    { type: 'paragraph', text: `Headings in this Policy are for convenience only and do not affect its interpretation. A reference to legislation includes that legislation as amended, re-enacted, or replaced from time to time. The word "including" means "including, without limitation".` },

    { type: 'heading', text: '2. Who this Policy applies to' },
    { type: 'paragraph', text: 'This Policy applies to three categories of Data Subjects:' },
    {
      type: 'bullets',
      items: [
        `**Customers** — people who browse Events and purchase Tickets.`,
        `**Event Organizers** — people or organisations who create Events, sell Tickets, and scan attendees at the gate.`,
        `**Administrators** — TicketFlow Kenya personnel who moderate the Platform.`,
      ],
    },
    { type: 'paragraph', text: 'Each category may be subject to different Processing activities, as described in detail throughout this Policy.' },

    { type: 'heading', text: '3. Information we collect' },
    { type: 'subheading', text: '3.1 Information you give us directly' },
    {
      type: 'bullets',
      items: [
        `**Account details**: full name, email address, phone number, and password (stored as a salted, irreversible cryptographic hash, never in plain text).`,
        `**Organizer details**: company or brand name, business description, and verification information requested before approval of an Organizer's first Event or before payouts are enabled.`,
        `**Event details**: Event titles, descriptions, venues, dates, ticket types, prices, and poster images submitted by Organizers.`,
        `**Transaction details**: ticket selections, Order references, and the M-Pesa phone number provided at checkout.`,
        `**Support communications**: any information voluntarily provided when contacting us for assistance, including the contents of support tickets and emails.`,
      ],
    },
    { type: 'subheading', text: '3.2 Information collected automatically' },
    {
      type: 'bullets',
      items: [
        `**Technical data**: IP address, browser type and version, device type and operating system, and approximate geographic location inferred from IP address.`,
        `**Usage data**: pages visited, Events viewed, search queries, and actions taken on the Platform.`,
        `**Cookies and similar technologies**, as described in detail in our [Cookie Policy](cookie-policy).`,
      ],
    },
    { type: 'subheading', text: '3.3 Information from payment processing' },
    { type: 'paragraph', text: `When a Customer pays via M-Pesa, Safaricom's Daraja platform transmits to us a payment confirmation containing the M-Pesa receipt number, the phone number used, the amount paid, and a success or failure result code. We do **not** receive, process, or store M-Pesa PINs, and we never have access to a Customer's mobile money account credentials.` },

    { type: 'heading', text: '4. Lawful basis for Processing' },
    { type: 'paragraph', text: 'We rely on one or more of the following lawful bases, recognised under the Data Protection Act, 2019, depending on the specific Processing activity:' },
    {
      type: 'bullets',
      items: [
        `**Performance of a contract** — to create your Account, process your Order, issue your Ticket, and otherwise perform our obligations to you.`,
        `**Consent** — for optional Processing, such as non-essential cookies, where you have given clear, informed consent.`,
        `**Legal obligation** — to comply with tax, accounting, and regulatory requirements applicable in Kenya.`,
        `**Legitimate interests** — to detect and prevent fraud, secure the Platform, and improve our services, balanced against your rights and freedoms.`,
      ],
    },

    { type: 'heading', text: '5. How we use your information' },
    {
      type: 'bullets',
      items: [
        'To create and manage your Account and authenticate you when you log in.',
        'To process Ticket Orders, initiate M-Pesa STK Push requests, and confirm payment status.',
        'To generate your QR-code e-Tickets and validate them at Event check-in.',
        'To allow Event Organizers to view their own attendee lists and sales for Events they created.',
        'To calculate and record the platform commission owed on each successful sale.',
        'To detect and prevent fraud, duplicate Ticket use, and abuse of the Platform.',
        'To send transactional communications, including Order confirmations, payment status updates, and password resets.',
        `To moderate Events submitted for approval and enforce our [Terms and Conditions](terms-and-conditions).`,
        'To comply with legal, tax, and regulatory obligations in Kenya.',
      ],
    },
    { type: 'paragraph', text: `**We do not sell your Personal Data to third parties**, and we do not use your Personal Data for purposes incompatible with those described in this Policy without first notifying you and, where required, obtaining your consent.` },

    { type: 'heading', text: '6. Who we share information with' },
    {
      type: 'bullets',
      items: [
        `**Event Organizers**, limited to attendee data (name, email, phone, ticket type, check-in status) for Events that the Customer has purchased a Ticket to — Organizers may not see data for Events they did not create.`,
        `**Payment partners**, currently Safaricom (M-Pesa Daraja), and potentially, in future, Flutterwave, Paystack, or card processors, solely to process and confirm payments.`,
        `**Service providers** who host our infrastructure, including cloud hosting and database providers, acting as Data Processors under confidentiality and data protection obligations.`,
        `**Regulators and law enforcement**, including the ODPC, where required by Kenyan law, a valid court order, or to protect the rights, property, or safety of TicketFlow Kenya, our users, or the public.`,
        `**Successors**, in the event of a merger, acquisition, or sale of assets, subject to equivalent privacy protections being maintained.`,
      ],
    },

    { type: 'heading', text: '7. International data transfers' },
    { type: 'paragraph', text: 'Where our service providers process Personal Data outside Kenya, we take reasonable steps to ensure such transfers comply with the Data Protection Act, 2019, including verifying that the recipient jurisdiction or organisation provides an adequate level of data protection, or that appropriate contractual safeguards are in place.' },

    { type: 'heading', text: '8. Data retention' },
    { type: 'paragraph', text: `We retain Account and transaction data for as long as your Account is active and for a reasonable period afterwards to meet our legal, accounting, audit, and fraud-prevention obligations, including audit logs of payment and check-in events. Event and Ticket records relating to completed transactions are retained for at least **seven (7) years** to comply with Kenyan tax record-keeping requirements. Where Personal Data is no longer necessary for these purposes, we securely delete or anonymise it.` },

    { type: 'heading', text: '9. Your rights as a Data Subject' },
    { type: 'paragraph', text: 'Under the Data Protection Act, 2019, you have the right to:' },
    {
      type: 'bullets',
      items: [
        `**Be informed** of how your Personal Data is used, as set out in this Policy.`,
        `**Access** the Personal Data we hold about you.`,
        `**Rectification** — request correction of inaccurate or outdated data.`,
        `**Erasure** — request deletion of your data, subject to our legal retention obligations.`,
        `**Restriction and objection** — object to or restrict certain Processing of your data.`,
        `**Data portability**, where technically feasible.`,
        `**Lodge a complaint** with the ODPC.`,
      ],
    },
    { type: 'paragraph', text: 'To exercise any of these rights, contact us using the details in Section 14. We will respond within the timelines required by the Data Protection Laws, and in any event no later than is reasonably practicable.' },

    { type: 'heading', text: '10. Automated decision-making' },
    { type: 'paragraph', text: 'Certain fraud-detection and duplicate-check-in safeguards on the Platform operate automatically, for example automatically rejecting a second scan of an already-used Ticket. These safeguards are narrow, rules-based, and do not produce legal effects concerning you of the kind requiring a right to human review under the Data Protection Laws; nonetheless, you may contact us if you believe an automated safeguard has produced an incorrect result.' },

    { type: 'heading', text: '11. Data security' },
    {
      type: 'bullets',
      items: [
        'Passwords are hashed with bcrypt and are never stored or transmitted in plain text.',
        'Access to administrative and Organizer functions is restricted by role-based access control.',
        'Sensitive Account, payment, and check-in actions are written to an internal audit log.',
        `Payment status can only be confirmed by our backend in response to a verified payment provider callback — it is never set directly by a user's browser.`,
      ],
    },
    { type: 'paragraph', text: 'No system is completely secure, but we take reasonable, industry-appropriate technical and organisational measures to protect your data against unauthorised access, alteration, disclosure, or loss, and we review these measures periodically.' },

    { type: 'heading', text: "12. Children's privacy" },
    { type: 'paragraph', text: 'The Platform is not directed at, and is not intended for use by, children under the age of eighteen (18). We do not knowingly collect Personal Data from children. If you believe a child has provided us with Personal Data, please contact us immediately so we can investigate and delete it.' },

    { type: 'heading', text: '13. Changes to this Policy' },
    { type: 'paragraph', text: 'We may update this Privacy Policy from time to time to reflect changes in our practices, the Platform, or the law. We will post the updated version with a new effective date, and where changes are material, we will provide additional notice, for example by email or an in-app banner. Continued use of the Platform after an update constitutes acceptance of the revised Policy.' },

    { type: 'heading', text: '14. Contact us' },
    { type: 'paragraph', text: `Questions, requests, or complaints about this Policy or how we handle your data can be sent to **privacy@ticketflow.co.ke**. You may also lodge a complaint directly with the Office of the Data Protection Commissioner, Kenya.` },
  ],
};

/**
 * Unlike the six documents around it, this one is specific to the App and has
 * no website original to be imported from — the website copy at
 * `frontend/app/legal/mobile-privacy-policy/` is the mirror of this text, not
 * its source. Full drafting notes live in `mobile/docs/privacy-policy.draft.md`.
 */
const MOBILE_PRIVACY_POLICY: LegalDocument = {
  slug: 'mobile-privacy-policy',
  title: 'Mobile App Privacy Policy',
  shortTitle: 'Mobile App Privacy',
  icon: 'smartphone',
  effectiveDate: 'To be confirmed',
  summary: 'Permissions, on-device storage, and app-specific data handling',
  status: 'draft',
  blocks: [
    { type: 'paragraph', text: `**TicketFlow Kenya** ("**TicketFlow Kenya**", "**we**", "**us**", or "**our**") is committed to protecting the privacy and personal data of every person who uses our mobile application. This Privacy Policy (the "**Policy**") is a formal, institution-level statement of the data protection practices that apply specifically to the **TicketFlow Kenya mobile application for Android and iOS** (the "**App**"), including the personal data the App collects, the permissions it requests from your device, what it stores on your device, and the rights available to you under Kenyan law.` },
    { type: 'paragraph', text: `The App is one part of the TicketFlow Kenya platform, which also comprises our website, our application programming interfaces, and related services (collectively, the "**Platform**"). Where this Policy and our general [Privacy Policy](privacy-policy) both apply, this Policy governs matters specific to the App, and the general Privacy Policy governs everything else. Both are read together.` },
    { type: 'paragraph', text: `We process personal data in accordance with the **Data Protection Act, 2019** (Kenya), the **Data Protection (General) Regulations, 2021**, and any successor or amending legislation (together, the "**Data Protection Laws**"). By installing or using the App, you confirm that you have read, understood, and accept this Policy. If you do not agree with any part of this Policy, you must not use the App.` },

    { type: 'heading', text: '1. Definitions and Interpretation' },
    { type: 'paragraph', text: `Capitalised terms not defined below have the meaning given to them in our general [Privacy Policy](privacy-policy) and our [Terms and Conditions](terms-and-conditions).` },
    {
      type: 'bullets',
      items: [
        `**"App"** means the TicketFlow Kenya mobile application for Android and iOS, including any development, preview, or pre-release variant of it.`,
        `**"Device"** means the mobile phone or tablet on which the App is installed.`,
        `**"Device Permission"** means an operating-system-level authorisation, such as camera access, that the App must request from you and that you may grant or refuse.`,
        `**"Local Storage"** means storage areas on your Device that the App writes to, including the operating system's encrypted credential store and the App's cache directory.`,
        `**"Ticket Code"** means the unique alphanumeric identifier and accompanying QR code generated for each Ticket.`,
        `**"Check-in"** means the act of scanning or manually validating a Ticket at an Event's point of entry.`,
      ],
    },
    { type: 'paragraph', text: `Headings are for convenience only and do not affect interpretation. A reference to legislation includes that legislation as amended, re-enacted, or replaced from time to time. The word "including" means "including, without limitation".` },

    { type: 'heading', text: '2. Who this Policy applies to' },
    { type: 'paragraph', text: 'This Policy applies to every person who installs and uses the App, in any of the roles the Platform supports:' },
    {
      type: 'bullets',
      items: [
        `**Customers** — people who browse Events, purchase Tickets, and hold e-Tickets in the App.`,
        `**Event Organizers and their authorised gate staff** — people who use the App's scanner to Check-in Attendees at an Event.`,
        `**Administrators** — TicketFlow Kenya personnel who access the App in a moderation capacity.`,
      ],
    },
    { type: 'paragraph', text: 'Each role may be subject to different Processing activities, as described below.' },

    { type: 'heading', text: '3. Information we collect through the App' },
    { type: 'subheading', text: '3.1 Information you give us directly' },
    {
      type: 'bullets',
      items: [
        `**Account details** — your full name, email address, phone number, and password, provided when you register or log in. Your password is transmitted to our servers for authentication and is stored there only as a salted, irreversible cryptographic hash. **The App never stores your password on your Device.**`,
        `**Order and attendee details** — the Tickets you select, and the name, email address, and phone number of each Attendee where an Order requires per-attendee details.`,
        `**Payment details** — the M-Pesa phone number you enter at checkout. This is transmitted to our backend, which initiates the M-Pesa STK Push on your behalf. **The App never asks for, receives, or transmits your M-Pesa PIN**, which you enter only on your own Device in Safaricom's own prompt.`,
        `**Support communications** — anything you voluntarily tell us when you contact us for help from within the App.`,
      ],
    },
    { type: 'subheading', text: '3.2 Information collected automatically' },
    { type: 'paragraph', text: 'When the App communicates with our servers, our backend receives the technical information inherent in any internet request, including your IP address and the approximate geographic region it implies, together with the date, time, and nature of the request. We also record server-side logs of authentication, payment, and Check-in events, as described in Section 14.' },
    { type: 'paragraph', text: `**The App itself contains no analytics, advertising, attribution, crash-reporting, or behavioural tracking software.** It does not build a usage profile of you, and it does not report which Events you browse or search for to any third party.` },
    { type: 'subheading', text: '3.3 Information from payment processing' },
    { type: 'paragraph', text: `When you pay via M-Pesa, Safaricom's Daraja platform sends a payment confirmation **to our backend**, not to the App, containing the M-Pesa receipt number, the phone number used, the amount paid, and a success or failure result code. The App learns the outcome only by asking our backend for the status of your own Order. We do not receive, process, or store M-Pesa PINs, and we never have access to your mobile money account credentials.` },
    { type: 'subheading', text: '3.4 Information we do not collect' },
    { type: 'paragraph', text: 'For the avoidance of doubt, the App does not request, access, collect, or transmit any of the following:' },
    {
      type: 'bullets',
      items: [
        'Your device location, whether precise or coarse. The App requests no location permission.',
        'Your contacts, calendar, call logs, SMS messages, or microphone.',
        'Your photo library or any file on your Device other than the ticket documents the App itself has saved.',
        'Any advertising identifier, and it does not participate in any advertising or cross-app tracking network.',
        'Health, biometric, financial account, or other special-category data.',
      ],
    },

    { type: 'heading', text: '4. Device Permissions' },
    { type: 'paragraph', text: `The App requests exactly **one** Device Permission:` },
    {
      type: 'bullets',
      items: [
        `**Camera** — requested only when you open the ticket scanner, which is available to Event Organizers and their authorised gate staff. The camera is used solely to read Ticket QR codes at an Event gate.`,
      ],
    },
    { type: 'paragraph', text: 'How the camera is used, precisely:' },
    {
      type: 'bullets',
      items: [
        `The camera preview is decoded **on your Device**. The App reads QR codes only; it does not read any other barcode format.`,
        `**No photograph, video, or camera frame is ever saved to your Device or transmitted to us or anyone else.** Only the decoded Ticket Code, together with the identifier of the Event being scanned, is sent to our servers to validate the Ticket.`,
        'The camera is active only while the scanner screen is open.',
        `You may refuse or later revoke this permission in your Device's settings. If you do, the scanner will not function, but every other part of the App will continue to work normally.`,
      ],
    },
    { type: 'paragraph', text: 'If the App ever requires an additional Device Permission, we will explain why at the point of the request and update this Policy before that version is released.' },

    { type: 'heading', text: '5. What the App stores on your Device' },
    {
      type: 'bullets',
      items: [
        `**Your login token** — held in the operating system's encrypted credential store (Android Keystore or iOS Keychain), so that you stay signed in between sessions. Removed when you log out, when your session expires, or when you uninstall the App.`,
        `**A cached copy of your basic profile** (name, email, phone, role) — held in the same encrypted credential store, so your profile appears immediately at startup without a network round trip. Removed at the same time as your login token.`,
        `**Ticket documents you have downloaded** — held in the App's private cache directory, so you can open and share your Ticket. Removed when you clear the App's cache or storage, or uninstall the App.`,
        `**Event poster images** — held in the App's private image cache, so artwork you have already seen is not downloaded again. Removed at the same time as downloaded Tickets.`,
      ],
    },
    { type: 'paragraph', text: `This data is held in the App's own private storage area, which the operating system isolates from other applications. Logging out clears your stored token and cached profile. Uninstalling the App removes everything listed above from your Device; it does not delete your Account or your Tickets from our servers, for which see Section 11.` },

    { type: 'heading', text: '6. Sharing a Ticket from the App' },
    { type: 'paragraph', text: `The App lets you share a downloaded Ticket using your Device's standard share sheet. If you use it, **you** are choosing to disclose that document — which contains your name, the Event details, and a valid Ticket Code — to whichever app, service, or person you select. That transfer happens between your Device and the recipient you choose; it does not pass through us, and we cannot recall it.` },
    { type: 'paragraph', text: 'Treat a Ticket Code as you would cash: anyone holding a valid, unused code may be able to use it to gain entry.' },

    { type: 'heading', text: '7. Lawful basis for Processing' },
    { type: 'paragraph', text: 'We rely on one or more of the following lawful bases under the Data Protection Act, 2019, depending on the Processing activity:' },
    {
      type: 'bullets',
      items: [
        `**Performance of a contract** — to create your Account, process your Order, issue your Ticket, and admit you to an Event.`,
        `**Consent** — for Device Permissions, which the operating system requires you to grant explicitly and which you may withdraw at any time in your Device settings.`,
        `**Legal obligation** — to comply with tax, accounting, and regulatory requirements applicable in Kenya.`,
        `**Legitimate interests** — to detect and prevent Ticket fraud, secure the Platform, and keep the App working correctly, balanced against your rights and freedoms.`,
      ],
    },

    { type: 'heading', text: '8. How we use information collected through the App' },
    {
      type: 'bullets',
      items: [
        'To create and manage your Account and keep you signed in securely.',
        'To process Ticket Orders, initiate M-Pesa STK Push requests, and report payment status back to you.',
        'To generate, display, and deliver your QR-code e-Tickets.',
        'To validate Tickets at Event Check-in and to reject duplicate or invalid ones.',
        'To show you notifications about your own Orders, Tickets, and Events, which the App retrieves from our servers when you open it.',
        'To detect and prevent fraud, duplicate Ticket use, and abuse of the Platform.',
        'To provide support when you contact us.',
        'To comply with legal, tax, and regulatory obligations in Kenya.',
      ],
    },
    { type: 'paragraph', text: `**We do not sell your personal data**, and we do not use it for purposes incompatible with those described in this Policy without first notifying you and, where required, obtaining your consent.` },

    { type: 'heading', text: '9. Who we share information with' },
    {
      type: 'bullets',
      items: [
        `**Event Organizers**, limited to attendee data (name, email, phone, ticket type, Check-in status) for Events to which you hold a Ticket. Organizers cannot see data for Events they did not create.`,
        `**Safaricom (M-Pesa Daraja)**, our payment partner, to initiate and confirm payments. This exchange happens between our backend and Safaricom.`,
        `**Service providers** who host our infrastructure, acting as Data Processors under confidentiality and data protection obligations.`,
        `**The app store operator** from which you installed the App — Google Play or the Apple App Store — which independently collects installation and, if you submit one, review data under **its own** privacy policy, not this one.`,
        `**Our build and distribution provider**, Expo Application Services, which compiles and distributes builds of the App. It processes developer and build metadata, not your Account data.`,
        `**Regulators and law enforcement**, including the Office of the Data Protection Commissioner, where required by Kenyan law, a valid court order, or to protect the rights, property, or safety of TicketFlow Kenya, our users, or the public.`,
        `**Successors**, in the event of a merger, acquisition, or sale of assets, subject to equivalent privacy protections being maintained.`,
      ],
    },

    { type: 'heading', text: '10. International data transfers' },
    { type: 'paragraph', text: 'Where our service providers process personal data outside Kenya, we take reasonable steps to ensure such transfers comply with the Data Protection Act, 2019, including verifying that the recipient jurisdiction or organisation provides an adequate level of data protection, or that appropriate contractual safeguards are in place.' },

    { type: 'heading', text: '11. Data retention' },
    { type: 'paragraph', text: 'Data held **on your Device** is retained as set out in Section 5 and is removed when you log out or uninstall the App.' },
    { type: 'paragraph', text: `Data held **on our servers** is retained for as long as your Account is active and for a reasonable period afterwards to meet our legal, accounting, audit, and fraud-prevention obligations. Event and Ticket records relating to completed transactions are retained for at least **seven (7) years** to comply with Kenyan tax record-keeping requirements. Where personal data is no longer necessary for these purposes, we securely delete or anonymise it.` },
    { type: 'paragraph', text: `**Uninstalling the App does not delete your Account.** To request deletion of your Account and the personal data we hold about you, use the "Request account deletion" option in the App's Profile screen, or contact us using the details in Section 16.` },

    { type: 'heading', text: '12. Your rights as a Data Subject' },
    { type: 'paragraph', text: 'Under the Data Protection Act, 2019, you have the right to:' },
    {
      type: 'bullets',
      items: [
        `**Be informed** of how your personal data is used, as set out in this Policy.`,
        `**Access** the personal data we hold about you.`,
        `**Rectification** — request correction of inaccurate or outdated data.`,
        `**Erasure** — request deletion of your data, subject to our legal retention obligations.`,
        `**Restriction and objection** — object to or restrict certain Processing.`,
        `**Data portability**, where technically feasible.`,
        `**Withdraw a Device Permission** at any time in your Device settings, without affecting the lawfulness of Processing carried out before withdrawal.`,
        `**Lodge a complaint** with the Office of the Data Protection Commissioner, Kenya.`,
      ],
    },
    { type: 'paragraph', text: 'To exercise any of these rights, contact us using the details in Section 16. We will respond within the timelines required by the Data Protection Laws.' },

    { type: 'heading', text: '13. Automated decision-making' },
    { type: 'paragraph', text: 'Certain fraud-detection safeguards operate automatically — most visibly, the automatic rejection of a second scan of an already-used Ticket. These safeguards are narrow and rules-based, and do not produce legal effects of the kind requiring a right to human review under the Data Protection Laws. You may nonetheless contact us if you believe an automated safeguard has produced an incorrect result at a gate.' },

    { type: 'heading', text: '14. Security' },
    {
      type: 'bullets',
      items: [
        `Your login token and cached profile are held in the operating system's encrypted credential store, not in ordinary application storage.`,
        `Communication between the App and our servers takes place over **HTTPS**.`,
        'Passwords are hashed with bcrypt server-side and are never stored on your Device.',
        'If your session expires or is revoked, the App clears its stored credentials and returns you to the login screen.',
        'Access to Organizer and administrative functions is restricted by role-based access control.',
        'Sensitive Account, payment, and Check-in actions are written to an internal audit log.',
        `Payment status can only be set by our backend in response to a verified Safaricom callback. **It is never set by the App**, so a modified or impersonated app cannot mark a Ticket as paid.`,
      ],
    },
    { type: 'paragraph', text: 'No system is completely secure, but we take reasonable, industry-appropriate technical and organisational measures to protect your data, and review them periodically.' },

    { type: 'heading', text: "15. Children's privacy" },
    { type: 'paragraph', text: 'The App is not directed at, and is not intended for use by, children under the age of eighteen (18). We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us immediately so we can investigate and delete it.' },

    { type: 'heading', text: '16. Contact us' },
    { type: 'paragraph', text: `Questions, requests, or complaints about this Policy or about how the App handles your data can be sent to **privacy@ticketflow.co.ke**. For help with an Order or a Ticket, contact **support@ticketflow.co.ke**. You may also lodge a complaint directly with the Office of the Data Protection Commissioner, Kenya.` },

    { type: 'heading', text: '17. Changes to this Policy' },
    { type: 'paragraph', text: 'We may update this Policy to reflect changes to the App, our practices, or the law — in particular if a future version requests a new Device Permission or introduces push notifications. We will publish the updated version with a new effective date and, where changes are material, give additional notice, for example by email or an in-app notice. Continued use of the App after an update constitutes acceptance of the revised Policy.' },
  ],
};

const TERMS_AND_CONDITIONS: LegalDocument = {
  slug: 'terms-and-conditions',
  title: 'Terms and Conditions',
  shortTitle: 'Terms & Conditions',
  icon: 'file-text',
  effectiveDate: '29 June 2026',
  summary: 'The agreement governing your use of TicketFlow Kenya',
  blocks: [
    { type: 'paragraph', text: `These Terms and Conditions (the "**Terms**") constitute a legally binding agreement governing access to and use of the TicketFlow Kenya website and services (the "**Platform**"), operated by **TicketFlow Kenya** ("**we**", "**us**", "**our**"). By creating an Account, browsing Events, purchasing a Ticket, or publishing an Event on the Platform, you ("**you**" or the "**User**") agree to be bound by these Terms, our [Privacy Policy](privacy-policy), our [Payment Policy](payment-policy), our [Ticket Purchase Policy](ticket-purchase-policy), and, if you register as an Organizer, our [Event Organizer Policy](event-organizer-policy) (together, the "**Policies**"). If you do not agree to these Terms in their entirety, you must not access or use the Platform.` },

    { type: 'heading', text: '1. Definitions and Interpretation' },
    { type: 'paragraph', text: 'In these Terms, the following capitalised terms have the following meanings:' },
    {
      type: 'bullets',
      items: [
        `**"Account"** means a registered user profile on the Platform.`,
        `**"Customer"** means a User who browses Events and purchases Tickets.`,
        `**"Event Organizer"** or **"Organizer"** means a User who creates, manages, and publishes Events, sells Tickets, and checks in attendees.`,
        `**"Administrator"** means TicketFlow Kenya personnel authorised to moderate Events, Users, and Payments.`,
        `**"Event"** means any gathering, performance, conference, or other occasion listed for ticket sale on the Platform by an Organizer.`,
        `**"Ticket"** means a digital, QR-code-bearing right of entry to an Event.`,
        `**"Order"** means a Customer's request to purchase one or more Tickets.`,
        `**"Content"** means any text, image, description, or other material uploaded to the Platform by a User.`,
        `**"Platform Commission"** means the percentage of the ticket price retained by TicketFlow Kenya on each successfully paid Ticket, as described in Section 7.`,
        `**"Force Majeure Event"** means any event beyond a party's reasonable control, including natural disaster, civil unrest, government action, or failure of a third-party payment network.`,
      ],
    },
    { type: 'paragraph', text: `Headings are for convenience only and do not affect interpretation. References to statutes include any amendment, re-enactment, or replacement. "Including" means "including, without limitation". Where the context permits, the singular includes the plural and vice versa.` },

    { type: 'heading', text: '2. Eligibility' },
    { type: 'paragraph', text: `You must be at least **eighteen (18) years old**, or the age of majority in your jurisdiction if higher, to create an Account. By registering, you represent and warrant that the information you provide is accurate, current, and complete, and that you have the legal capacity to enter into these Terms. We reserve the right to verify your eligibility and to suspend or terminate an Account where eligibility cannot be confirmed.` },

    { type: 'heading', text: '3. Accounts and roles' },
    { type: 'paragraph', text: 'The Platform supports three Account roles:' },
    {
      type: 'bullets',
      items: [
        `**Customer** — may browse Events and purchase Tickets.`,
        `**Event Organizer** — may create, manage, and publish Events, sell Tickets, and check in attendees at the gate, subject to our [Event Organizer Policy](event-organizer-policy).`,
        `**Administrator** — moderates Events, Users, and Payments on the Platform.`,
      ],
    },
    { type: 'paragraph', text: `You are solely responsible for maintaining the confidentiality of your password and authentication credentials, and for all activity that occurs under your Account, whether or not authorised by you. You must notify us immediately at **support@ticketflow.co.ke** of any unauthorised use of your Account or any other breach of security.` },

    { type: 'heading', text: "4. TicketFlow Kenya's role" },
    { type: 'paragraph', text: `TicketFlow Kenya provides the technology Platform that connects Event Organizers with Customers. Unless explicitly stated otherwise in writing, **Event Organizers — not TicketFlow Kenya — are the seller of record** for Tickets to their Events, and are solely responsible for the Event actually taking place, its content, safety, and compliance with applicable law. TicketFlow Kenya is not a party to the contract of sale between an Organizer and a Customer beyond facilitating ticketing and payment processing, and does not guarantee, warrant, or endorse any Event listed on the Platform.` },

    { type: 'heading', text: '5. Acceptable use' },
    { type: 'paragraph', text: 'You agree that you will not, and will not attempt to:' },
    {
      type: 'bullets',
      items: [
        'Use the Platform for any unlawful purpose or in violation of these Terms.',
        'Create Events that are fraudulent, misleading, or for goods or services prohibited by Kenyan law.',
        'Forge, duplicate, resell outside the Platform, or otherwise tamper with QR-code Tickets.',
        'Circumvent, disable, or interfere with security-related features of the Platform.',
        'Scrape, reverse-engineer, or use automated means to access the Platform without our prior written consent.',
        'Upload Content that is defamatory, obscene, infringing, or that you do not have the rights to use.',
        'Impersonate any person or entity, or misrepresent your affiliation with any person or entity.',
        'Use the Platform to transmit any virus, malware, or other harmful code.',
      ],
    },
    { type: 'paragraph', text: 'A breach of this Section 5 is a material breach of these Terms and may result in immediate suspension or termination of your Account, in addition to any other remedies available to us at law.' },

    { type: 'heading', text: '6. Event listings and approval' },
    { type: 'paragraph', text: `Events created by Organizers progress through a defined lifecycle: they begin as **Draft**, move to **Pending Approval** once submitted, and become visible to Customers only once an Administrator marks them **Published**. We may reject, suspend, or remove any Event, at our reasonable discretion, including, without limitation, for suspected fraud, prohibited content, safety concerns, inaccurate information, or violation of these Terms. Approval of an Event is an internal moderation step only and does **not** constitute an endorsement, warranty, or guarantee of the Event or its Organizer by TicketFlow Kenya.` },

    { type: 'heading', text: '7. Tickets, payments, and Platform Commission' },
    { type: 'paragraph', text: `Ticket purchases and payments are governed in detail by our [Ticket Purchase Policy](ticket-purchase-policy) and [Payment Policy](payment-policy), each of which forms an integral part of these Terms. TicketFlow Kenya charges a Platform Service Fee on each successfully paid Ticket, currently **nine per cent (9%) of the ticket price** by default, added on top of the ticket price and paid by the buyer at checkout; Organizers receive the full ticket price as their earnings. The applicable commission rate is shown to Organizers before they publish ticket pricing and may be varied for future Events with reasonable prior notice.` },

    { type: 'heading', text: '8. Intellectual property' },
    { type: 'paragraph', text: `The Platform, including its design, source code, databases, trademarks, and branding, is owned by TicketFlow Kenya or its licensors and is protected by applicable intellectual property laws, including copyright and trademark law. Organizers retain ownership of the Content they upload, including event descriptions and poster images, but grant TicketFlow Kenya a **non-exclusive, worldwide, royalty-free licence** to host, reproduce, and display that Content on the Platform and in associated marketing, solely for the purpose of promoting and selling Tickets to the relevant Event. You may not use our trademarks, logos, or branding without our prior written consent.` },

    { type: 'heading', text: '9. Disclaimers' },
    { type: 'paragraph', text: `The Platform is provided "**as is**" and "**as available**", without warranties of any kind, whether express, implied, or statutory, to the fullest extent permitted by law. We do not warrant that the Platform will be uninterrupted, timely, secure, or error-free, or that any defects will be corrected. We are not responsible for the conduct of any Organizer or Customer, the quality, legality, or safety of any Event, or whether an Event actually takes place as advertised.` },

    { type: 'heading', text: '10. Limitation of liability' },
    { type: 'paragraph', text: `To the maximum extent permitted by Kenyan law, TicketFlow Kenya's total aggregate liability arising out of or relating to these Terms or the Platform, whether in contract, tort, or otherwise, shall not exceed the total Platform Commission we actually earned from the transaction(s) giving rise to the claim. In no event shall we be liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, goodwill, or data, even if we have been advised of the possibility of such damages. Nothing in these Terms limits liability that cannot lawfully be limited or excluded under Kenyan law.` },

    { type: 'heading', text: '11. Indemnification' },
    { type: 'paragraph', text: 'You agree to indemnify, defend, and hold harmless TicketFlow Kenya, its directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable legal fees, arising out of or in any way connected with your breach of these Terms, your use of the Platform, or your violation of any applicable law or third-party right.' },

    { type: 'heading', text: '12. Suspension and termination' },
    { type: 'paragraph', text: 'We may suspend or terminate your Account, with or without notice, if you breach these Terms, engage in fraudulent or unlawful activity, or where required by law or by a competent authority. You may close your Account at any time by contacting us; outstanding obligations, such as pending payouts, unresolved disputes, or audit retention requirements, will continue to apply and be honoured or resolved notwithstanding closure of your Account.' },

    { type: 'heading', text: '13. Force Majeure' },
    { type: 'paragraph', text: 'Neither party shall be liable for any failure or delay in performance under these Terms to the extent such failure or delay is caused by a Force Majeure Event, provided that the affected party promptly notifies the other and uses reasonable efforts to mitigate the impact.' },

    { type: 'heading', text: '14. Assignment' },
    { type: 'paragraph', text: 'You may not assign or transfer any of your rights or obligations under these Terms without our prior written consent. We may assign or transfer our rights and obligations under these Terms, including in connection with a merger, acquisition, or sale of assets, without restriction.' },

    { type: 'heading', text: '15. Severability' },
    { type: 'paragraph', text: 'If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be severed, and the remaining provisions shall continue in full force and effect.' },

    { type: 'heading', text: '16. Waiver' },
    { type: 'paragraph', text: 'No failure or delay by TicketFlow Kenya in exercising any right under these Terms shall operate as a waiver of that right, nor shall any single or partial exercise preclude any further exercise of that or any other right.' },

    { type: 'heading', text: '17. Entire agreement' },
    { type: 'paragraph', text: 'These Terms, together with the Policies incorporated by reference, constitute the entire agreement between you and TicketFlow Kenya regarding the Platform, and supersede all prior or contemporaneous agreements, representations, or understandings, whether written or oral.' },

    { type: 'heading', text: '18. Notices' },
    { type: 'paragraph', text: `We may provide notices to you via the email address or phone number associated with your Account, or by posting a notice on the Platform. You may send formal notices to us at **support@ticketflow.co.ke**.` },

    { type: 'heading', text: '19. Changes to these Terms' },
    { type: 'paragraph', text: 'We may update these Terms from time to time. Continued use of the Platform after an update constitutes acceptance of the revised Terms. Material changes will be communicated via the Platform or by email with reasonable advance notice where practicable.' },

    { type: 'heading', text: '20. Governing law and dispute resolution' },
    { type: 'paragraph', text: `These Terms are governed by, and construed in accordance with, the laws of the **Republic of Kenya**. Any dispute arising out of or in connection with these Terms shall first be addressed through good-faith negotiation between the parties, and, failing resolution within thirty (30) days, shall be subject to the exclusive jurisdiction of the courts of Kenya.` },

    { type: 'heading', text: '21. Contact us' },
    { type: 'paragraph', text: `For questions about these Terms, contact **support@ticketflow.co.ke**.` },
  ],
};

const PAYMENT_POLICY: LegalDocument = {
  slug: 'payment-policy',
  title: 'Payment Policy',
  shortTitle: 'Payment Policy',
  icon: 'credit-card',
  effectiveDate: '29 June 2026',
  summary: 'How M-Pesa payments, fees, and refunds are handled',
  blocks: [
    { type: 'paragraph', text: `This Payment Policy (the "**Policy**") is the formal, institutional statement governing how payments are processed on the TicketFlow Kenya platform (the "**Platform**"), including M-Pesa payments, how Platform Commission is calculated, and what happens when a payment succeeds, fails, or is disputed. It forms an integral part of our [Terms and Conditions](terms-and-conditions) and should be read together with them.` },

    { type: 'heading', text: '1. Definitions' },
    {
      type: 'bullets',
      items: [
        `**"Order"** means a Customer's request to purchase one or more Tickets, together with its associated payment record.`,
        `**"Payment"** means the monetary transaction associated with an Order, initiated via a supported payment method.`,
        `**"M-Pesa STK Push"** (also known as "Lipa na M-Pesa Online") means Safaricom's mobile money checkout mechanism, accessed through the Daraja application programming interface.`,
        `**"Daraja"** means Safaricom's official API platform used to initiate and confirm M-Pesa payments.`,
        `**"Platform Commission"** means the percentage of the ticket price retained by TicketFlow Kenya on each successfully paid Ticket.`,
        `**"Organizer Earning"** means the ticket price less the applicable Platform Commission, credited to the Organizer's account.`,
        `**"Callback"** means the secure, authenticated message sent by a payment provider to our backend confirming the outcome of a Payment.`,
      ],
    },

    { type: 'heading', text: '2. Supported payment methods' },
    { type: 'paragraph', text: `At launch, TicketFlow Kenya supports payments via **M-Pesa STK Push** (Lipa na M-Pesa Online), Safaricom's mobile money checkout. Our payment architecture is deliberately modular, so additional methods such as card payments, Flutterwave, or Paystack may be added in future without changing how Orders or Tickets fundamentally work.` },

    { type: 'heading', text: '3. How an M-Pesa payment works' },
    {
      type: 'steps',
      items: [
        `You select Tickets and create an Order. The Order is held as **Pending** and the selected Tickets are reserved so they cannot be sold to another Customer while payment is completed.`,
        'You enter the M-Pesa phone number you wish to pay with and confirm.',
        'We send an STK Push request to Daraja, which triggers a payment prompt on that phone number.',
        'You enter your M-Pesa PIN on your own device to authorise the payment. We never see, transmit, or store your PIN.',
        'Safaricom sends us a Callback confirming whether the Payment succeeded or failed.',
        `**Only that Callback can mark your Payment as successful** — your Ticket and Order status are never set to "Paid" based on what your browser reports, which protects both Customers and Organizers from manipulated or spoofed payment confirmations.`,
        `On success, your QR-code Ticket(s) are generated immediately and become available under "My Tickets".`,
      ],
    },

    { type: 'heading', text: '4. Payment statuses' },
    {
      type: 'bullets',
      items: [
        `**Pending** — Payment has been initiated and we are awaiting confirmation.`,
        `**Success** — Payment confirmed by the payment provider; Tickets are issued.`,
        `**Failed** — Payment was not completed, for example due to insufficient funds, PIN entry cancellation, or timeout; any reserved Tickets are released back into inventory.`,
        `**Cancelled** — the Payment attempt was cancelled before completion.`,
      ],
    },

    { type: 'heading', text: '5. Order statuses' },
    {
      type: 'bullets',
      items: [
        `**Pending** — Order created, awaiting successful Payment.`,
        `**Paid** — Payment confirmed; Tickets issued.`,
        `**Failed** — Payment did not succeed; the Order did not result in a sale.`,
        `**Cancelled** — Order cancelled before or instead of Payment.`,
      ],
    },

    { type: 'heading', text: '6. Platform Commission' },
    { type: 'paragraph', text: `TicketFlow Kenya charges a Platform Service Fee on each Order — **nine per cent (9%) of the ticket price by default** — added on top of the ticket price and paid by the buyer at checkout. The full ticket price, the Organizer Earning, is recorded against the Organizer's account. The fee is charged only on completed, successful sales; there is **no charge** on pending, failed, or cancelled Orders. Any future change to the default commission rate will be communicated to Organizers in advance and will apply only to new sales made after the change takes effect.` },

    { type: 'heading', text: '7. Currency and pricing' },
    { type: 'paragraph', text: `All prices on the Platform are listed and charged in **Kenyan Shillings (KES)** unless stated otherwise. Organizers are solely responsible for setting accurate ticket prices, including any applicable taxes they are required to account for under Kenyan law.` },

    { type: 'heading', text: '8. Failed and pending payments' },
    { type: 'paragraph', text: `If an M-Pesa prompt times out, is cancelled, or fails, the Order is marked **Failed** and any reserved ticket stock is automatically released so other Customers may purchase it. You may simply attempt the purchase again. If you were charged by M-Pesa but your Order still shows as Pending or Failed after a reasonable time, contact us immediately at **payments@ticketflow.co.ke** with your M-Pesa transaction message so we can investigate.` },

    { type: 'heading', text: '9. Refunds' },
    { type: 'paragraph', text: `Refund eligibility depends on the circumstances of the Order — see our [Ticket Purchase Policy](ticket-purchase-policy) for full details. In summary:` },
    {
      type: 'bullets',
      items: [
        'If an Event is cancelled by its Organizer and is not rescheduled, affected Ticket holders are entitled to a refund.',
        'We do not process card or M-Pesa chargebacks directly; approved refunds are issued back to the original payment method, for example the M-Pesa number used, where technically possible.',
        `Refunds are **not available** simply because a Customer changes their mind, except where required by Kenyan consumer protection law.`,
      ],
    },

    { type: 'heading', text: '10. Disputes and chargebacks' },
    { type: 'paragraph', text: `If you believe you were charged in error, contact us first at **payments@ticketflow.co.ke** with your Order number and M-Pesa transaction code so that we can investigate using our payment and audit records. We aim to resolve Payment disputes within **fourteen (14) business days** of receiving a complete report.` },

    { type: 'heading', text: '11. Organizer payouts' },
    { type: 'paragraph', text: `Organizer Earnings accrue against the Organizer's account as sales are confirmed. Payout schedules, methods, and any minimum payout thresholds will be communicated separately to Organizers and may evolve as the Platform grows; see our [Event Organizer Policy](event-organizer-policy) for further detail.` },

    { type: 'heading', text: '12. Anti-fraud and compliance' },
    { type: 'paragraph', text: 'We reserve the right to delay, hold, or decline a Payment, Order, or payout where we reasonably suspect fraud, money laundering, or a violation of these Policies or applicable law, including any obligations under Kenyan anti-money-laundering legislation. Where practicable, we will notify the affected User and the reason for the action taken.' },

    { type: 'heading', text: '13. Security' },
    { type: 'paragraph', text: 'We do not store M-Pesa PINs, card numbers, or card CVV codes. Payment confirmations are received only over secure, authenticated Callbacks from our payment providers. Sensitive payment events are recorded in an internal audit log for fraud detection and dispute resolution purposes.' },

    { type: 'heading', text: '14. Limitation of liability' },
    { type: 'paragraph', text: 'To the maximum extent permitted by Kenyan law, TicketFlow Kenya is not liable for delays or failures in Payment processing caused by a third-party payment provider, including Safaricom Daraja, network outages, or events beyond our reasonable control.' },

    { type: 'heading', text: '15. Changes to this Policy' },
    { type: 'paragraph', text: 'We may update this Payment Policy as we add new payment methods or as regulatory requirements change. The version of this Policy in force at the time of a transaction applies to that transaction.' },

    { type: 'heading', text: '16. Contact us' },
    { type: 'paragraph', text: `For Payment queries, contact **payments@ticketflow.co.ke**.` },
  ],
};

const TICKET_PURCHASE_POLICY: LegalDocument = {
  slug: 'ticket-purchase-policy',
  title: 'Ticket Purchase Policy',
  shortTitle: 'Ticket Purchase Policy',
  icon: 'tag',
  effectiveDate: '29 June 2026',
  summary: 'Buying, using, and refunding tickets',
  blocks: [
    { type: 'paragraph', text: `This Ticket Purchase Policy (the "**Policy**") is the formal, institutional statement of how buying a Ticket on TicketFlow Kenya works, what you are entitled to, and what happens if an Event changes or is cancelled. It forms an integral part of our [Terms and Conditions](terms-and-conditions).` },

    { type: 'heading', text: '1. Definitions' },
    {
      type: 'bullets',
      items: [
        `**"Ticket"** means a digital, QR-code-bearing right of entry to an Event, issued upon successful payment of an Order.`,
        `**"Order"** means a Customer's request to purchase one or more Tickets.`,
        `**"Event Organizer"** or **"Organizer"** means the person or entity responsible for hosting the Event to which a Ticket relates.`,
        `**"Ticket Code"** means the unique alphanumeric identifier and accompanying QR code generated for each Ticket.`,
        `**"Check-in"** means the act of scanning or manually validating a Ticket at an Event's point of entry.`,
      ],
    },

    { type: 'heading', text: '2. Who you are buying from' },
    { type: 'paragraph', text: `When you buy a Ticket, you are entering into a contract with the **Event Organizer**, who is responsible for the Event itself. TicketFlow Kenya acts solely as the ticketing and payment platform that issues your Ticket and processes your payment, and is not a party to the underlying contract for the Event.` },

    { type: 'heading', text: '3. Placing an Order' },
    {
      type: 'steps',
      items: [
        'Select an Event and choose one or more Ticket Types and quantities.',
        'We check availability and reserve your selected Tickets so they cannot be sold to someone else while you complete payment.',
        'An Order is created showing the ticket subtotal, the Platform Service Fee added at checkout, and the final total you will pay.',
        `You complete payment, typically via M-Pesa STK Push — see our [Payment Policy](payment-policy) for full detail.`,
      ],
    },
    { type: 'paragraph', text: 'Reserved Tickets are only guaranteed to you once your payment is confirmed successful. If payment fails, is cancelled, or times out, your reservation is released and the Tickets become available to other Customers again.' },

    { type: 'heading', text: '4. Conditions that block a purchase' },
    { type: 'paragraph', text: 'You will not be able to complete a purchase where, at the time of checkout:' },
    {
      type: 'bullets',
      items: [
        'The Event has been cancelled.',
        `The Event has already taken place, marked **Completed**, or its start time has passed.`,
        'The selected Ticket Type is sold out, meaning the requested quantity exceeds what remains available.',
      ],
    },

    { type: 'heading', text: '5. Your e-Ticket' },
    { type: 'paragraph', text: `Once payment is confirmed, we generate a unique QR-code e-Ticket for each Ticket purchased, available under "My Tickets" and viewable or printable from its Ticket page. Your e-Ticket contains a unique Ticket Code and QR code — **keep it confidential** and do not share screenshots of it publicly, as anyone holding a valid, unused code may be able to use it to gain entry.` },

    { type: 'heading', text: '6. Entry and Check-in' },
    {
      type: 'bullets',
      items: [
        `Present your e-Ticket's QR code, or your Ticket Code for manual Check-in, at the Event entrance.`,
        `**Each Ticket can only be used once.** Once Checked-in, a Ticket is marked "Used" and any further attempt to use it — including duplicates or screenshots shared with others — will be rejected.`,
        `The exact time of Check-in is recorded for the Organizer's records and for fraud prevention.`,
        `You may be asked to present identification matching the name on the Order, at the Organizer's discretion.`,
      ],
    },

    { type: 'heading', text: '7. Ticket statuses' },
    {
      type: 'bullets',
      items: [
        `**Active** — valid and not yet used.`,
        `**Used** — already Checked-in at the Event gate.`,
        `**Cancelled** — voided, typically because the related Event or Order was cancelled.`,
        `**Refunded** — a refund was issued for this Ticket; it is no longer valid for entry.`,
      ],
    },

    { type: 'heading', text: '8. Changes of mind and transfers' },
    { type: 'paragraph', text: `Tickets are generally **non-refundable and non-exchangeable** once payment is successful, except as described in Section 9 below or as required by Kenyan consumer protection law. The Platform does **not** currently support transferring a Ticket to another person's account; treat your Ticket Code and QR code as you would cash, and only share them with someone you intend to let use that specific Ticket.` },

    { type: 'heading', text: '9. Cancelled or postponed Events' },
    {
      type: 'bullets',
      items: [
        `**If the Organizer cancels the Event** and does not reschedule it, you are entitled to a refund of the amount you paid for that Order.`,
        `**If the Event is postponed** to a new confirmed date, your existing Ticket(s) normally remain valid for the new date. If you cannot attend the new date, you may request a refund within the window communicated for that Event.`,
        `Refunds approved under this section are issued to the original payment method, for example the M-Pesa number used for the Order, where technically possible, normally within **fourteen (14) business days** of approval.`,
      ],
    },

    { type: 'heading', text: '10. Disputed or failed entries' },
    { type: 'paragraph', text: `If you are wrongly refused entry with a valid, unused Ticket, or if you believe your Ticket was fraudulently used by someone else before you arrived, contact us immediately at **support@ticketflow.co.ke** with your Ticket Code and Order number, and also raise it with the Organizer's staff at the venue. We will investigate using our Check-in audit records, which show exactly when and by whom each Ticket was scanned.` },

    { type: 'heading', text: '11. Accuracy of attendee details' },
    { type: 'paragraph', text: 'You are responsible for providing accurate contact details, including name, email, and phone number, at the time of registration, since this information is used to identify you as the Ticket holder and to contact you about your Order.' },

    { type: 'heading', text: '12. Limitation of liability' },
    { type: 'paragraph', text: `TicketFlow Kenya is not responsible for the conduct, quality, or actual occurrence of an Event, which remains the responsibility of the Organizer. Our role is limited to ticketing, payment processing, and Check-in validation, as further described in our [Terms and Conditions](terms-and-conditions).` },

    { type: 'heading', text: '13. Severability' },
    { type: 'paragraph', text: 'If any provision of this Policy is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.' },

    { type: 'heading', text: '14. Changes to this Policy' },
    { type: 'paragraph', text: 'We may update this Policy from time to time. The version of this Policy in force at the time of your Order applies to that Order.' },

    { type: 'heading', text: '15. Contact us' },
    { type: 'paragraph', text: `For help with an Order or Ticket, contact **support@ticketflow.co.ke** with your Order number or Ticket Code.` },
  ],
};

const EVENT_ORGANIZER_POLICY: LegalDocument = {
  slug: 'event-organizer-policy',
  title: 'Event Organizer Policy',
  shortTitle: 'Event Organizer Policy',
  icon: 'calendar',
  effectiveDate: '29 June 2026',
  summary: 'Obligations that apply to Organizer accounts',
  blocks: [
    { type: 'paragraph', text: `This Event Organizer Policy (the "**Policy**") is the formal, institutional statement of the obligations applicable to anyone who registers on TicketFlow Kenya with an Organizer Account to create, publish, and sell Tickets to Events. It forms an integral part of our [Terms and Conditions](terms-and-conditions). By submitting an Event for approval, you agree to this Policy in addition to our general Terms.` },

    { type: 'heading', text: '1. Definitions' },
    {
      type: 'bullets',
      items: [
        `**"Organizer"** means a User who registers an Organizer Account to create, manage, and publish Events.`,
        `**"Event"** means any gathering, performance, conference, or other occasion listed for ticket sale by an Organizer.`,
        `**"Ticket Type"** means a category of Ticket for an Event, such as Regular, VIP, VVIP, Student, or Early Bird, each with its own price and quantity.`,
        `**"Attendee"** means a Customer who holds a valid Ticket to an Event.`,
        `**"Check-in"** means the act of scanning or manually validating a Ticket at an Event's point of entry.`,
        `**"Platform Commission"** means the percentage of the ticket price retained by TicketFlow Kenya on each successfully paid Ticket.`,
        `**"Organizer Earning"** means the ticket price less the applicable Platform Commission.`,
      ],
    },

    { type: 'heading', text: '2. Becoming an Organizer' },
    { type: 'paragraph', text: 'You register as an Organizer by selecting the Organizer role at sign-up and providing a company or brand name. We may request additional verification information before approving your first Event or before enabling payouts, including a valid phone number, identification, or business registration details. We reserve the right to decline or revoke Organizer status at our reasonable discretion, including where verification information cannot be confirmed.' },

    { type: 'heading', text: '3. Event lifecycle' },
    { type: 'paragraph', text: 'Every Event you create moves through the following defined statuses:' },
    {
      type: 'bullets',
      items: [
        `**Draft** — visible only to you, fully editable, not yet submitted.`,
        `**Pending Approval** — submitted for review by a TicketFlow Kenya Administrator.`,
        `**Published** — approved and visible to Customers; Tickets can be sold.`,
        `**Rejected** — not approved, with a reason provided; you may edit and resubmit.`,
        `**Cancelled** — withdrawn by you or suspended by an Administrator; no further sales.`,
        `**Completed** — the Event date has passed.`,
      ],
    },
    { type: 'paragraph', text: `Editing a **Published** Event's core details returns it to **Pending Approval** so changes can be reviewed before they go live again.` },

    { type: 'heading', text: '4. Approval review' },
    { type: 'paragraph', text: `We review submitted Events for, among other things: accuracy of information, prohibited or unlawful content, misleading pricing, safety concerns, and impersonation. Approval is granted at our reasonable discretion and is **not** a guarantee or endorsement of the Event. We aim to review submissions promptly but do not guarantee a specific turnaround time.` },

    { type: 'heading', text: '5. Accuracy of your listing' },
    { type: 'paragraph', text: 'You are responsible for ensuring that your Event listing is accurate and not misleading, including:' },
    {
      type: 'bullets',
      items: [
        'Correct date, time, venue, and address.',
        'An accurate description of what Attendees will receive.',
        'Honest Ticket Type names, inclusions, and quantities available.',
        'A poster image you own or have the legal right to use.',
      ],
    },

    { type: 'heading', text: '6. Ticket Types and pricing' },
    { type: 'paragraph', text: 'You may create multiple Ticket Types per Event (for example, Regular, VIP, VVIP, Student, Early Bird), each with its own price and quantity. Once a Ticket Type has any completed sales, its quantity cannot be reduced below the number already sold, and it cannot be deleted — this protects Customers who have already purchased that Ticket Type. You may still add new Ticket Types or adjust quantities upward at any time before the Event.' },

    { type: 'heading', text: '7. Your responsibilities as the seller of record' },
    { type: 'paragraph', text: 'Unless we agree otherwise in writing, you, the Organizer, are solely responsible for:' },
    {
      type: 'bullets',
      items: [
        'Actually holding the Event as advertised, or promptly notifying TicketFlow Kenya and your Attendees of any change, postponement, or cancellation.',
        'Complying with all applicable Kenyan laws, licences, and permits required to host your Event, including venue permits, county licences, copyright and performance licences, and security and safety requirements.',
        'The safety, conduct, and overall experience of Attendees at your Event.',
        'Honouring the Ticket Types and inclusions you advertised.',
        'Responding to Attendee queries about your Event in a timely manner.',
      ],
    },

    { type: 'heading', text: '8. Platform Commission and earnings' },
    { type: 'paragraph', text: `TicketFlow Kenya charges a Platform Service Fee of **nine per cent (9%) of the ticket price by default** on each successfully paid Ticket, added at checkout and paid by the buyer. Your Organizer Earning per Ticket is the full ticket price you set. Commission rates and any future changes will be shown in your Organizer dashboard before they apply to new sales. See our [Payment Policy](payment-policy) for how this is calculated and paid out.` },

    { type: 'heading', text: '9. Cancelling or postponing your Event' },
    { type: 'paragraph', text: `If you need to cancel your Event, use the "Cancel Event" action in your Organizer dashboard as soon as possible. Cancelling stops further sales. Where Tickets have already been sold to a cancelled Event, affected Customers are entitled to a refund as described in our [Ticket Purchase Policy](ticket-purchase-policy). If your Event is postponed to a new confirmed date, existing Tickets normally remain valid for the new date unless you state otherwise and we communicate this clearly to Ticket holders.` },

    { type: 'heading', text: '10. Check-in and ticket scanning' },
    { type: 'paragraph', text: `You and anyone you authorise under your Organizer Account may scan or manually validate Tickets at the gate using the Platform's scanner tools. Each Ticket can only be Checked-in once; the Platform automatically rejects a second Check-in attempt and records who performed each Check-in for audit purposes. You are responsible for the conduct of anyone you allow to use your scanning credentials.` },

    { type: 'heading', text: '11. Attendee data' },
    { type: 'paragraph', text: `You may view and export the Attendee list (name, email, phone, Ticket Type, Check-in status) for Events you created, in order to manage entry and provide customer service. This data must only be used for purposes related to that Event — it may **not** be sold, rented, or used for unrelated marketing without the Attendee's consent, and must be handled in line with the Data Protection Act, 2019.` },

    { type: 'heading', text: '12. Suspension of Events or Accounts' },
    { type: 'paragraph', text: 'We may suspend a Published Event or your Organizer Account where we reasonably suspect fraud, a safety issue, a breach of this Policy, or non-compliance with the law. Where possible, we will explain the reason and give you a reasonable opportunity to respond before any suspension becomes permanent.' },

    { type: 'heading', text: '13. Indemnity' },
    { type: 'paragraph', text: 'You agree to indemnify, defend, and hold harmless TicketFlow Kenya from and against any claims, losses, liabilities, or damages, including reasonable legal fees, arising from your Event, your conduct as an Organizer, or your breach of this Policy or applicable law.' },

    { type: 'heading', text: '14. Relationship of the parties' },
    { type: 'paragraph', text: 'Nothing in this Policy creates a partnership, joint venture, agency, or employment relationship between you and TicketFlow Kenya. You act as an independent Organizer at all times.' },

    { type: 'heading', text: '15. Changes to this Policy' },
    { type: 'paragraph', text: 'We may update this Policy from time to time. Continued use of your Organizer Account after an update constitutes acceptance of the revised Policy.' },

    { type: 'heading', text: '16. Contact us' },
    { type: 'paragraph', text: `For Organizer support, including verification, payouts, or approval questions, contact **organizers@ticketflow.co.ke**.` },
  ],
};

const COOKIE_POLICY: LegalDocument = {
  slug: 'cookie-policy',
  title: 'Cookie Policy',
  shortTitle: 'Cookie Policy',
  icon: 'database',
  effectiveDate: '29 June 2026',
  summary: 'Cookies and similar storage technologies we use',
  blocks: [
    { type: 'paragraph', text: `This Cookie Policy (the "**Policy**") is the formal, institutional statement explaining what cookies and similar technologies are, which ones TicketFlow Kenya uses, the lawful basis for using them, and how you can control them. It forms an integral part of our [Privacy Policy](privacy-policy).` },

    { type: 'heading', text: '1. Definitions' },
    {
      type: 'bullets',
      items: [
        `**"Cookie"** means a small text file placed on your device by a website to store information about your visit.`,
        `**"Similar Technologies"** means browser storage mechanisms such as localStorage and sessionStorage that serve a comparable purpose to Cookies.`,
        `**"Strictly Necessary Cookies"** means Cookies required for the Platform to function, which cannot be switched off.`,
        `**"Session"** means the period during which you are logged in and actively using the Platform.`,
      ],
    },

    { type: 'heading', text: '2. What are cookies?' },
    { type: 'paragraph', text: 'Cookies are small text files placed on your device when you visit a website. We also use Similar Technologies, such as localStorage, for the same purposes described below. These technologies let a website recognise your device and remember information about your visit, such as whether you are logged in.' },

    { type: 'heading', text: '3. Lawful basis for using cookies' },
    { type: 'paragraph', text: `We rely on **your consent** for non-essential Cookies, obtained through the cookie banner described in Section 5, and on our **legitimate interest** in operating a secure and functional Platform for Strictly Necessary Cookies, which do not require consent under the Data Protection Laws.` },

    { type: 'heading', text: '4. Categories of cookies we use' },
    { type: 'subheading', text: '4.1 Strictly necessary' },
    { type: 'paragraph', text: 'Required for the Platform to function and cannot be switched off. These include your session or login token, stored in your browser so you stay logged in, and a record of your cookie consent choice itself.' },
    { type: 'subheading', text: '4.2 Functional' },
    { type: 'paragraph', text: 'Remember your preferences, such as filters you have applied while browsing Events, to make your next visit more convenient.' },
    { type: 'subheading', text: '4.3 Analytics' },
    { type: 'paragraph', text: `Help us understand how the Platform is used, for example which Events are viewed most and which pages have errors, so we can improve it. Where used, analytics data is aggregated and is **not** used to personally identify you for marketing purposes.` },
    { type: 'subheading', text: '4.4 Payment-related' },
    { type: 'paragraph', text: 'Used during checkout to track the status of an in-progress M-Pesa payment so we can show you up-to-date confirmation without requiring you to refresh the page.' },

    { type: 'heading', text: '5. Cookies we do not use' },
    { type: 'paragraph', text: `We do **not** use third-party advertising Cookies, and we do **not** sell information collected through Cookies to advertisers.` },

    { type: 'heading', text: '6. Managing your cookie preferences' },
    { type: 'paragraph', text: `When you first visit the Platform, you will see a cookie banner where you can accept all Cookies or continue with only Strictly Necessary Cookies. You can change your mind at any time by clearing your browser's site data for TicketFlow Kenya, which will show the banner again on your next visit. Most browsers also let you block or delete Cookies directly in their settings; note that blocking Strictly Necessary Cookies or storage will prevent you from staying logged in or completing a purchase.` },

    { type: 'heading', text: '7. Third-party cookies' },
    { type: 'paragraph', text: 'Some functionality is provided by third parties who may set their own Cookies when their component is active on the page, for example:' },
    {
      type: 'bullets',
      items: [
        'Our payment provider, Safaricom M-Pesa Daraja, during checkout.',
        `Camera and QR-scanning libraries used on the Organizer's gate-scanning page, which run entirely in your browser and do not transmit images anywhere other than to our check-in API as decoded Ticket codes.`,
      ],
    },

    { type: 'heading', text: '8. Retention of cookie data' },
    { type: 'paragraph', text: 'Strictly Necessary Cookies generally expire at the end of your Session or when you log out. Functional and analytics Cookies, where enabled, persist for a limited period defined by their purpose, after which they expire automatically.' },

    { type: 'heading', text: '9. Changes to this Policy' },
    { type: 'paragraph', text: 'We may update this Cookie Policy as the technologies we use evolve. Continued use of the Platform after an update constitutes acceptance of the revised Policy.' },

    { type: 'heading', text: '10. Contact us' },
    { type: 'paragraph', text: `Questions about this Cookie Policy can be sent to **privacy@ticketflow.co.ke**.` },
  ],
};

/** Ordered exactly as the website's legal sidebar lists them. */
export const LEGAL_DOCUMENTS: LegalDocument[] = [
  PRIVACY_POLICY,
  MOBILE_PRIVACY_POLICY,
  TERMS_AND_CONDITIONS,
  PAYMENT_POLICY,
  TICKET_PURCHASE_POLICY,
  EVENT_ORGANIZER_POLICY,
  COOKIE_POLICY,
];

export function getLegalDocument(slug: string | undefined): LegalDocument | undefined {
  return LEGAL_DOCUMENTS.find((doc) => doc.slug === slug);
}

export function isLegalSlug(slug: string | undefined): slug is LegalSlug {
  return LEGAL_DOCUMENTS.some((doc) => doc.slug === slug);
}
