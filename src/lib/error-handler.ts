/**
 * Error Handler Utility
 * مدیریت متمرکز خطاها در سرور
 */

import * as Sentry from '@sentry/nextjs';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;

    Error.captureStackTrace(this, this.constructor);
  }
}

// خطاهای از پیش تعریف شده
export const Errors = {
  // Authentication
  UNAUTHORIZED: new AppError('احراز هویت الزامی است', 401, 'UNAUTHORIZED'),
  FORBIDDEN: new AppError('دسترسی غیرمجاز', 403, 'FORBIDDEN'),
  INVALID_CREDENTIALS: new AppError(
    'نام کاربری یا رمز عبور اشتباه است',
    401,
    'INVALID_CREDENTIALS',
  ),

  // Validation
  VALIDATION_ERROR: (message: string) => new AppError(message, 400, 'VALIDATION_ERROR'),
  INVALID_INPUT: new AppError('ورودی نامعتبر است', 400, 'INVALID_INPUT'),

  // Resources
  NOT_FOUND: (resource: string) => new AppError(`${resource} یافت نشد`, 404, 'NOT_FOUND'),
  ALREADY_EXISTS: (resource: string) =>
    new AppError(`${resource} قبلاً وجود دارد`, 409, 'ALREADY_EXISTS'),

  // Rate Limiting
  TOO_MANY_REQUESTS: new AppError('تعداد درخواست‌ها بیش از حد مجاز است', 429, 'TOO_MANY_REQUESTS'),

  // Server
  INTERNAL_ERROR: new AppError('خطای داخلی سرور', 500, 'INTERNAL_ERROR'),
  DATABASE_ERROR: new AppError('خطا در ارتباط با پایگاه داده', 500, 'DATABASE_ERROR'),
};

// نوع برگشتی استاندارد برای Server Actions
export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// Wrapper برای Server Actions با مدیریت خطا
export async function safeAction<T>(
  action: () => Promise<T>,
  errorMessage = 'خطایی رخ داده است',
): Promise<ActionResult<T>> {
  try {
    const data = await action();
    return { success: true, data };
  } catch (error) {
    // لاگ کردن خطا
    logError(error, { errorMessage });

    if (error instanceof AppError) {
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }

    // Prisma errors
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: { target?: string[] } };

      if (prismaError.code === 'P2002') {
        const field = prismaError.meta?.target?.[0] || 'فیلد';
        return {
          success: false,
          error: {
            message: `این ${field} قبلاً استفاده شده است`,
            code: 'DUPLICATE_ENTRY',
          },
        };
      }

      if (prismaError.code === 'P2025') {
        return {
          success: false,
          error: {
            message: 'رکورد مورد نظر یافت نشد',
            code: 'NOT_FOUND',
          },
        };
      }
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        code: 'UNKNOWN_ERROR',
      },
    };
  }
}

// لاگ کردن خطا به Sentry و console
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const _errorInfo = {
    timestamp: new Date().toISOString(),
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  };

  // در development لاگ کن
  if (process.env.NODE_ENV === 'development') {
    // L1-fix: در dev پیام خطا به console می‌رود تا debug آسان‌تر شود
    if (error instanceof Error) {
      // biome-ignore lint/no-console: intentional dev-only logging
      console.error('[error-handler]', error.name, error.message, context);
    }
  }

  // ارسال به Sentry در production
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    if (error instanceof Error) {
      Sentry.captureException(error, {
        extra: context,
        tags: {
          errorType: error instanceof AppError ? 'AppError' : 'Error',
        },
      });
    } else {
      Sentry.captureMessage(String(error), {
        level: 'error',
        extra: { ...context, originalError: error },
      });
    }
  }
}

// Capture user feedback
export function captureUserFeedback(
  eventId: string,
  feedback: { name?: string; email?: string; comments: string },
): void {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureFeedback({
      associatedEventId: eventId,
      name: feedback.name || 'Anonymous',
      email: feedback.email || 'anonymous@example.com',
      message: feedback.comments,
    });
  }
}

// Set user context for Sentry
export function setUserContext(user: { id: string; email?: string; role?: string }): void {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

// Clear user context (on logout)
export function clearUserContext(): void {
  if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser(null);
  }
}
