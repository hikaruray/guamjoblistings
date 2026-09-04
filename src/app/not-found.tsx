import { PalmLogo } from "@/components/icons";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
      <p className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-cyan-50 text-cyan-600"><PalmLogo className="h-10 w-10" /></p>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">
        Page not found
      </h1>
      <p className="mt-2 text-slate-500">
        The page you&apos;re looking for doesn&apos;t exist or may have been
        removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
      >
        Back to home
      </Link>
    </div>
  );
}
