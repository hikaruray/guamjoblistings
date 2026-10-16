import LoginForm from "./LoginForm";

export const metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; loggedOut?: string }>;
}) {
  const { next, loggedOut } = await searchParams;
  // Only ever return to an Admin page — never an address someone put in a link.
  const target = next && /^\/admin(\/|\?|$)/.test(next) && !next.startsWith("/admin/login")
    ? next
    : "/admin";

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold text-slate-900">Admin login</h1>
      {loggedOut && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          You are logged out.
        </p>
      )}
      <LoginForm next={target} />
    </div>
  );
}
