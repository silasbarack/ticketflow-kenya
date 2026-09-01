import { z } from 'zod';
import { isValidKenyanPhone } from './phone';

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.email('Enter a valid email address'),
    phoneNumber: z.string().refine(isValidKenyanPhone, 'Enter a valid Kenyan phone number'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
    agreedToTerms: z.literal(true, { error: 'You must accept the Terms to continue' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.email('Enter a valid email address'),
});
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Per-ticket attendee details, mirroring the web checkout's requirements:
 * both names, a national ID for gate checks, and contactable email/phone.
 */
export const attendeeSchema = z.object({
  firstName: z.string().min(2, 'Enter a first name'),
  lastName: z.string().min(2, 'Enter a last name'),
  nationalId: z.string().min(4, 'Enter a valid National ID number'),
  email: z.email('Enter a valid email address'),
  phone: z.string().refine(isValidKenyanPhone, 'Enter a valid Kenyan phone number'),
});
export type AttendeeFormValues = z.infer<typeof attendeeSchema>;

export const buyerDetailsSchema = z.object({
  buyerName: z.string().min(2, 'Enter your full name'),
  buyerEmail: z.email('Enter a valid email address'),
  buyerPhone: z.string().refine(isValidKenyanPhone, 'Enter a valid M-Pesa phone number'),
  acceptedTerms: z.literal(true, { error: 'You must accept the refund policy to continue' }),
});
export type BuyerDetailsFormValues = z.infer<typeof buyerDetailsSchema>;
