import Link from "next/link";

// Top bar for every Admin screen: where you are, the other screens, and the
// way out. Log out is a plain form POST so it works even if scripts fail.
export default function AdminNav({ current }: { current: "dashboard" | "accounts" }) {
  const tab = (key: typeof current, href: string, label: string) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${
        current === key
          ? "bg-slate-900 text-white"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
      <nav className="flex gap-2">
        {tab("dashboard", "/admin", "Dashboard")}
        {tab("accounts", "/admin/accounts", "Accounts")}
      </nav>
      <form method="post" action="/api/admin/logout">
        <button
          type="submit"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          Log out
        </button>
      </form>
    </div>
  );
}
