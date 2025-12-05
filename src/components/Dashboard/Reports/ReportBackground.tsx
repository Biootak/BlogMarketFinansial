'use client';

export function ReportBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Animated Gradient Orbs - Responsive sizes */}
      <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] md:w-[500px] md:h-[500px] lg:w-[600px] lg:h-[600px] bg-gradient-to-bl from-blue-400/20 via-indigo-400/15 to-transparent rounded-full blur-3xl animate-pulse" />
      <div
        className="absolute bottom-[-10%] left-[-10%] w-[250px] h-[250px] sm:w-[350px] sm:h-[350px] md:w-[450px] md:h-[450px] lg:w-[500px] lg:h-[500px] bg-gradient-to-tr from-purple-400/15 via-pink-400/10 to-transparent rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '1s' }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] md:w-[400px] md:h-[400px] bg-gradient-to-br from-emerald-400/10 to-transparent rounded-full blur-3xl animate-pulse"
        style={{ animationDelay: '2s' }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:32px_32px] sm:bg-[size:48px_48px] md:bg-[size:64px_64px]" />
    </div>
  );
}
