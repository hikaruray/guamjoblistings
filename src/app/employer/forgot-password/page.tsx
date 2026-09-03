import { Suspense } from "react";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Reset your password",
  description: "Send yourself a link to set a new employer password.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
