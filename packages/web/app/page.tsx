import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-16">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-500">Teen Patti scoring</p>
      <h1 className="mt-3 font-display text-5xl text-forest-900 md:text-6xl">E-Patti</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">
        Record packed players as the round unfolds, auto-set the last remaining winner, calculate net points, and
        generate a settlement sheet. E-Patti never processes or transfers money.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/register" className="rounded-lg bg-forest-900 px-5 py-3 font-semibold text-cream-50">
          Create account
        </Link>
        <Link href="/login" className="rounded-lg border border-cream-200 bg-white px-5 py-3 font-semibold text-forest-900">
          Log in
        </Link>
      </div>
    </main>
  );
}
