"use client";

import { useMagicAuth } from "@/hooks/use-auth";
import { CheckCircle2Icon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import { Logo } from "@agentset/ui/logo";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { magicLogin, isSendingMagicLink, sent, email, setEmail } =
    useMagicAuth();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await magicLogin();
  };

  return (
    <div
      className={cn(
        "w-full max-w-md rounded-xl bg-white shadow-md ring-1 ring-black/5",
        className,
      )}
      {...props}
    >
      {sent ? (
        <div className="flex flex-col items-center justify-center p-7 sm:p-11">
          <CheckCircle2Icon className="size-8" />
          <h1 className="mt-4 text-lg font-medium">Check your email</h1>
          <p className="mt-1 max-w-2xs text-center text-sm text-gray-600">
            We've sent a magic link to your email. Click the link to login.
          </p>
        </div>
      ) : (
        <div className="p-7 sm:p-11">
          <form onSubmit={handleSubmit}>
            <div className="flex items-start">
              <a href="/" target="_blank" title="Home">
                <Logo className="h-9 fill-black" />
              </a>
            </div>
            <h1 className="mt-8 text-base/6 font-medium">Welcome back!</h1>
            <p className="mt-1 text-sm/5 text-gray-600">
              Sign in to your account to continue.
            </p>

            <div className="mt-8 space-y-3">
              <Label className="text-sm/5 font-medium" htmlFor="email">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mt-8">
              <Button
                type="submit"
                className="w-full"
                isLoading={isSendingMagicLink}
              >
                Sign in
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
