import type { Metadata } from "next";
import { GradientBackground } from "@/components/gradient-background";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login",
};

export const dynamic = "force-static";

export default function LoginPage() {
  return (
    <main className="overflow-hidden bg-gray-50">
      <GradientBackground />
      <div className="isolate flex min-h-dvh items-center justify-center p-6 lg:p-8">
        <LoginForm />
      </div>
    </main>
  );
}
