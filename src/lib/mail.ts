import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, token: string) => {
  const confrmLink = `https://blog-market-finansial-4s7ql8cdc-biotak.vercel.app/verify-request?token=${token}`;

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'ایمیل تایید',
    html: `<p>لطفاً این لینک را در ایمیل خود باز کنید:</p><p><a href="${confrmLink}">${confrmLink}</a></p>`,
  });
};
