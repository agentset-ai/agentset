"use client";

import { useState } from "react";
import { useLoginError, useMagicAuth, useOtpAuth } from "@/hooks/use-auth";
import { AlertCircleIcon, ArrowLeftIcon, CheckCircle2Icon } from "lucide-react";

import { Alert, AlertTitle } from "@agentset/ui/alert";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { Input } from "@agentset/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@agentset/ui/input-otp";
import { Label } from "@agentset/ui/label";
import { Logo } from "@agentset/ui/logo";

type LoginMode = "magic" | "otp";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [mode, setMode] = useState<LoginMode>("magic");
  const {
    magicLogin,
    isSendingMagicLink,
    sent,
    email,
    setEmail,
    reset: resetMagic,
  } = useMagicAuth();
  const {
    email: otpEmail,
    setEmail: setOtpEmail,
    otp,
    setOtp,
    otpSent,
    error: otpError,
    sendOtp,
    isSendingOtp,
    verifyOtp,
    isVerifyingOtp,
    reset: resetOtp,
  } = useOtpAuth();
  const error = useLoginError();

  const handleMagicSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await magicLogin();
  };

  const handleOtpSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendOtp();
  };

  const handleOtpVerify = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    verifyOtp();
  };

  const switchToOtp = async () => {
    setOtpEmail(email);
    await sendOtp(email);
    resetMagic();
    setMode("otp");
  };

  const switchToMagic = () => {
    resetOtp();
    setMode("magic");
  };

  const displayError = mode === "otp" ? otpError : error;
  const showError = displayError && !sent && !otpSent;

  return (
    <>
      {showError && (
        <Alert className="w-full max-w-md" variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>{displayError}</AlertTitle>
        </Alert>
      )}

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
        ) : mode === "otp" ? (
          <div className="p-7 sm:p-11">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={switchToMagic}
                type="button"
                aria-label="Back to magic link"
              >
                <ArrowLeftIcon className="size-4" />
              </Button>
              <a href="/" target="_blank" title="Home">
                <Logo className="h-9 fill-black" />
              </a>
            </div>

            {otpSent ? (
              <form onSubmit={handleOtpVerify}>
                <h1 className="mt-8 text-base/6 font-medium">
                  Enter your code
                </h1>
                <p className="mt-1 text-sm/5 text-gray-600">
                  We sent a 6-digit code to {otpEmail}
                </p>

                <div className="mt-8 flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={setOtp}
                    onComplete={verifyOtp}
                    autoFocus
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="mt-8">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isVerifyingOtp}
                    disabled={otp.length !== 6}
                  >
                    {isVerifyingOtp ? "Verifying..." : "Verify code"}
                  </Button>
                </div>

                <div className="mt-4 text-center">
                  <Button
                    variant="link"
                    type="button"
                    onClick={() => sendOtp()}
                    disabled={isSendingOtp}
                    className="text-sm text-gray-600"
                  >
                    {isSendingOtp ? "Sending..." : "Resend code"}
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOtpSend}>
                <h1 className="mt-8 text-base/6 font-medium">
                  Sign in with code
                </h1>
                <p className="mt-1 text-sm/5 text-gray-600">
                  We'll send a 6-digit code to your email.
                </p>

                <div className="mt-8 space-y-3">
                  <Label className="text-sm/5 font-medium" htmlFor="otp-email">
                    Email
                  </Label>
                  <Input
                    id="otp-email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                  />
                </div>

                <div className="mt-8">
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={isSendingOtp}
                  >
                    Send code
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="p-7 sm:p-11">
            <form onSubmit={handleMagicSubmit}>
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

      {sent && (
        <p className="mt-4 text-center text-sm text-gray-600">
          Magic link not working?{" "}
          <button
            type="button"
            onClick={switchToOtp}
            className="cursor-pointer font-medium text-gray-800 underline underline-offset-4 hover:text-black"
          >
            Use a login code instead
          </button>
        </p>
      )}
    </>
  );
}
