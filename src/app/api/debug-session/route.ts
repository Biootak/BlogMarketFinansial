import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'دسترسی غیرمجاز' } },
        { status: 403 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        hasSession: true,
        user: {
          id: session.user.id,
          role: session.user.role,
        },
      },
    });
  } catch (error) {
    // M6 fix: do not leak raw error messages (DB/stack hints) to the client.
    console.error('[debug-session] error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'خطای داخلی سرور',
        },
      },
      { status: 500 },
    );
  }
}
