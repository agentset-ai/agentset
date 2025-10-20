import type { Dispatch, SetStateAction } from "react";
import { useCallback, useMemo, useState } from "react";
import { useRouterStuff } from "@/hooks/use-router-stuff";

import { PLANS, PRO_PLAN } from "@agentset/stripe/plans";
import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@agentset/ui/dialog";

function WelcomeModal({
  showWelcomeModal,
  setShowWelcomeModal,
}: {
  showWelcomeModal: boolean;
  setShowWelcomeModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { searchParams, queryParams } = useRouterStuff();

  const planId = searchParams.get("plan");
  const upgraded = searchParams.get("upgraded");

  // const handlePlanUpgrade = async () => {
  //   if (planId) {
  //     const currentPlan = getPlanDetails(planId);
  //     const period = searchParams.get("period");
  //     if (currentPlan && period) {
  //       // TODO: Add analytics
  //     }
  //   }
  // };
  // useEffect(() => {
  //   handlePlanUpgrade();
  // }, [searchParams, planId]);

  const plan = planId
    ? (PLANS.find(
        (p) => p.name.toLowerCase() === planId.replace("+", " ").toLowerCase(),
      ) ?? PRO_PLAN)
    : undefined;

  const handleClose = () => {
    setShowWelcomeModal(false);
    queryParams({
      del: ["upgraded", "plan", "period"],
    });
  };

  return (
    <Dialog
      open={showWelcomeModal}
      onOpenChange={(newOpen: boolean) => {
        if (!newOpen) handleClose();
        else setShowWelcomeModal(newOpen);
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {plan
              ? `Agentset ${plan.name} looks good on you!`
              : "Welcome to Agentset!"}
          </DialogTitle>
          <DialogDescription>
            {upgraded
              ? `Thank you for upgrading to the ${plan?.name} plan! You now have access to more powerful features and higher limits.`
              : "Thanks for signing up – your account is ready to go! Now you have one central, organized place to build and manage all your short links."}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6">
          <Button type="button" onClick={handleClose}>
            Get Started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useWelcomeModal() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  const WelcomeModalCallback = useCallback(() => {
    return (
      <WelcomeModal
        showWelcomeModal={showWelcomeModal}
        setShowWelcomeModal={setShowWelcomeModal}
      />
    );
  }, [showWelcomeModal, setShowWelcomeModal]);

  return useMemo(
    () => ({
      setShowWelcomeModal,
      WelcomeModal: WelcomeModalCallback,
    }),
    [setShowWelcomeModal, WelcomeModalCallback],
  );
}
