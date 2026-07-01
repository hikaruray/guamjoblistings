import { Suspense } from "react";
import EmployerLoginForm from "./EmployerLoginForm";

export const metadata = {
  title: "Employer sign in",
  description: "Sign in to post and manage jobs on Guam Job Listings.",
};

export default function EmployerLoginPage() {
  return (
    <Suspense fallback={null}>
      <EmployerLoginForm />
    </Suspense>
  );
}
