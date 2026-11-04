/** Every background job type. Handlers register themselves from their own module. */
export const JOB_TYPES = {
  TICKET_EMAIL: 'TICKET_EMAIL',
  PAYMENT_FAILED_NOTICE: 'PAYMENT_FAILED_NOTICE',
  EVENT_REMINDER: 'EVENT_REMINDER',
  VERIFICATION_REMINDER: 'VERIFICATION_REMINDER',
  ADMIN_ALERT_EMAIL: 'ADMIN_ALERT_EMAIL',
} as const;
