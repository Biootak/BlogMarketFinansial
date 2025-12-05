import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendVerificationEmail = async (email: string, token: string) => {
  if (!resend) {
    console.warn('Resend API key not configured. Email not sent.');
    return;
  }

  const confrmLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-request?token=${token}`;

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'ایمیل تایید',
    html: `<p>لطفاً این لینک را در ایمیل خود باز کنید:</p><p><a href="${confrmLink}">${confrmLink}</a></p>`,
  });
};
