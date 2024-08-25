import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async (email: string, token: string) => {
  const confrmLink = `http://localhost:3000/verify-request?token=${token}`;

  await resend.emails.send({
    from: 'onboarding@resend.dev',
    to: email,
    subject: 'ایمیل تایید',
    html: `<p>لطفاً این لینک را در ایمیل خود باز کنید:</p><p><a href="${confrmLink}">${confrmLink}</a></p>`,
  });
};
