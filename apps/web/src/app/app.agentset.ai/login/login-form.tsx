"use client";

import { useGithubAuth, useGoogleAuth, useMagicAuth } from "@/hooks/use-auth";
import { CheckCircle2Icon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { GithubIcon } from "@agentset/ui/icons/github";
import { GoogleIcon } from "@agentset/ui/icons/google";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";
import { Logo } from "@agentset/ui/logo";

export function LoginForm({
  className,
  redirectParam,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  redirectParam?: string;
}) {
  const { email, setEmail, sent, magicLogin, isSendingMagicLink } =
    useMagicAuth();
  const { googleLogin, isLoggingInWithGoogle } = useGoogleAuth();
  const { githubLogin, isLoggingInWithGithub } = useGithubAuth();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    magicLogin();
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

          <div className="after:border-border relative my-4 text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
            <span className="bg-background text-muted-foreground relative z-10 px-2">
              Or
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => googleLogin()}
              isLoading={isLoggingInWithGoogle}
              type="button"
            >
              <GoogleIcon className="size-4" />
              Google
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => githubLogin()}
              isLoading={isLoggingInWithGithub}
              type="button"
            >
              <GithubIcon className="size-4" />
              Github
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
