import { Suspense } from "react";
import NewPasswordForm from "./NewPasswordForm";

export const metadata = {
  title: "Set a new password",
  robots: { index: false, follow: false },
};

export default function NewPasswordPage() {
  return (
    <Suspense fallback={null}>
      <NewPasswordForm />
    </Suspense>
  );
}
