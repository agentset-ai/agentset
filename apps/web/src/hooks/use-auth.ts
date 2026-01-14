import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useMutation } from "@tanstack/react-query";
import { useIsClient } from "usehooks-ts";

const useRedirectParam = () => {
  const params = useSearchParams();
  const isClient = useIsClient();
  if (!isClient) return "/";

  const redirectParam = params.get("r");
  const value =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  return value;
};

export const useLoginError = () => {
  const params = useSearchParams();
  const isClient = useIsClient();
  if (!isClient) return null;

  const errorCode = params.get("error") as
    | keyof typeof authClient.$ERROR_CODES
    | null;
  if (!errorCode) return null;

  if (errorCode === "INVALID_TOKEN")
    return "The magic link is invalid or expired. Please try again.";

  return "An error occurred. Please try again.";
};

export const useMagicAuth = () => {
  const redirect = useRedirectParam();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const { mutateAsync: magicLogin, isPending: isSendingMagicLink } =
    useMutation({
      mutationFn: () =>
        authClient.signIn.magicLink({
          email: email.trim(),
          callbackURL: redirect,
          errorCallbackURL: "/login",
        }),
      onSuccess: () => {
        logEvent("auth_magic_link_sent", { email });
        setSent(true);
      },
    });

  return {
    email,
    setEmail,
    sent,
    magicLogin,
    isSendingMagicLink,
  };
};

export const useGoogleAuth = () => {
  const redirect = useRedirectParam();

  const { mutateAsync: googleLogin, isPending: isLoggingInWithGoogle } =
    useMutation({
      mutationFn: () =>
        authClient.signIn.social({
          provider: "google",
          callbackURL: redirect,
          errorCallbackURL: "/login",
        }),
      onSuccess: () => {
        logEvent("auth_social_login", { provider: "google" });
      },
    });

  return {
    googleLogin,
    isLoggingInWithGoogle,
  };
};

export const useGithubAuth = () => {
  const redirect = useRedirectParam();
  const { mutateAsync: githubLogin, isPending: isLoggingInWithGithub } =
    useMutation({
      mutationFn: () =>
        authClient.signIn.social({
          provider: "github",
          callbackURL: redirect,
          errorCallbackURL: "/login",
        }),
      onSuccess: () => {
        logEvent("auth_social_login", { provider: "github" });
      },
    });

  return {
    githubLogin,
    isLoggingInWithGithub,
  };
};
