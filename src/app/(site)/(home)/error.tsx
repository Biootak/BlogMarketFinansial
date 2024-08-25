'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="error-container">
      <h2>مشکلی پیش آمده است</h2>
      <p>متأسفانه در بارگذاری اسلایدر خطایی رخ داده است.</p>
      <button onClick={() => reset()}>تلاش مجدد</button>
    </div>
  );
}
