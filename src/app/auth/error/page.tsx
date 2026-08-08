export default function AuthError({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const error = searchParams.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Authentication Error</h2>
          <p className="mt-2 text-sm text-gray-600">
            {error === 'Configuration' ? (
              <>
                There was a problem with the server configuration.
                <br />
                Please check the server logs for more information.
              </>
            ) : error === 'AccessDenied' ? (
                <>You do not have permission to sign in.</>
              ) : error === 'Verification' ? (
                <>The verification link has expired or is invalid.</>
              ) : (
                <>An error occurred during authentication.</>
              )}
          </p>
          <div className="mt-6">
            <a
              href="/auth"
              className="inline-flex justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}