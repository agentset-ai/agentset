import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";
import posthog from "posthog-js";

export function useSession() {
  const {
    data: session,
    refetch,
    isLoading,
  } = useQuery({
    queryKey: ["session"],
    queryFn: () => authClient.getSession().then((res) => res.data),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    if (session?.user) {
      posthog.identify(session.user.id, {
        email: session.user.email,
        name: session.user.name,
      });
    }
  }, [session]);

  const isAdmin = session?.user.role === "admin";

  return {
    session,
    refetch,
    isLoading,
    isAdmin,
  };
}
