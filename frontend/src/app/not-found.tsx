import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4">
      <div className="max-w-md w-full text-center p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
        <h1 className="text-6xl font-extrabold text-indigo-600 dark:text-indigo-400 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Page Not Found</h2>
        <p className="text-slate-600 dark:text-slate-300 text-sm mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-sm transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
