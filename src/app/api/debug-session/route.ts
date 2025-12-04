import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const session = await auth();
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();
    
    // فقط اسم cookie ها رو برگردون، نه مقادیرشون
    const cookieNames = allCookies.map(c => c.name);
    
    return NextResponse.json({
      hasSession: !!session,
      user: session?.user ? {
        id: session.user.id,
        role: session.user.role,
        email: session.user.email?.substring(0, 3) + '***', // مخفی کردن ایمیل
      } : null,
      cookies: cookieNames,
      env: {
        hasAuthSecret: !!process.env.AUTH_SECRET,
        authSecretLength: process.env.AUTH_SECRET?.length,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        trustHost: process.env.AUTH_TRUST_HOST,
        nodeEnv: process.env.NODE_ENV,
      },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
