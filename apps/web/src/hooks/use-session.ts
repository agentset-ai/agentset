import { useEffect } from "react";
import { loadPosthog } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useQuery } from "@tanstack/react-query";

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
      const { id, email, name } = session.user;
      void loadPosthog()?.then((posthog) => {
        posthog.identify(id, { email, name });
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
