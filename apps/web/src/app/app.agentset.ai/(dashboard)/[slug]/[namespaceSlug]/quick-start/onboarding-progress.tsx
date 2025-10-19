import Link from "next/link";
import { CheckIcon } from "lucide-react";

import { cn } from "@agentset/ui/cn";
import { Skeleton } from "@agentset/ui/skeleton";

export type OnboardingStatus = "complete" | "current" | "upcoming";

const NamespaceOnboardingProgress = ({
  steps,
}: {
  steps: {
    name: string;
    description?: string;
    href?: string;
    status?: "complete" | "current" | "upcoming";
  }[];
}) => {
  return (
    <nav aria-label="Progress">
      <ol role="list" className="overflow-hidden">
        {steps.map((step, stepIdx) => {
          const Tag = step.href ? Link : "div";

          return (
            <li
              key={step.name}
              className={cn(
                stepIdx !== steps.length - 1 && "pb-10",
                "relative",
                step.href ? "hover:cursor-pointer hover:underline" : "",
              )}
            >
              {!step.status ? (
                <>
                  {stepIdx !== steps.length - 1 ? (
                    <Skeleton
                      aria-hidden="true"
                      className="absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5"
                    />
                  ) : null}
                  <Tag
                    href={step.href as string}
                    className="group relative flex items-start"
                  >
                    <span className="flex h-9 items-center">
                      <Skeleton className="size-8 rounded-full" />
                    </span>
                    <span
                      className={cn(
                        "ml-4 flex min-w-0 flex-col",
                        !step.description && "self-center",
                      )}
                    >
                      <span className="text-base font-medium">{step.name}</span>
                      {step.description && (
                        <span className="text-muted-foreground text-base">
                          {step.description}
                        </span>
                      )}
                    </span>
                  </Tag>
                </>
              ) : step.status === "complete" ? (
                <>
                  {stepIdx !== steps.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="bg-primary absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5"
                    />
                  ) : null}
                  <Tag
                    href={step.href as string}
                    className="group relative flex items-start"
                  >
                    <span className="flex h-9 items-center">
                      <span className="bg-primary group-hover:bg-primary/80 relative z-10 flex size-8 items-center justify-center rounded-full">
                        <CheckIcon
                          aria-hidden="true"
                          className="size-5 text-white"
                        />
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-4 flex min-w-0 flex-col",
                        !step.description && "self-center",
                      )}
                    >
                      <span className="text-base font-medium">{step.name}</span>
                      {step.description && (
                        <span className="text-muted-foreground text-base">
                          {step.description}
                        </span>
                      )}
                    </span>
                  </Tag>
                </>
              ) : step.status === "current" ? (
                <>
                  {stepIdx !== steps.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="bg-border absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5"
                    />
                  ) : null}
                  <Tag
                    href={step.href as string}
                    aria-current="step"
                    className="group relative flex items-start"
                  >
                    <span aria-hidden="true" className="flex h-9 items-center">
                      <span className="border-primary bg-background relative z-10 flex size-8 items-center justify-center rounded-full border-2">
                        <span className="bg-primary size-2.5 rounded-full" />
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-4 flex min-w-0 flex-col",
                        !step.description && "self-center",
                      )}
                    >
                      <span className="text-primary text-base font-medium">
                        {step.name}
                      </span>
                      {step.description && (
                        <span className="text-muted-foreground text-base">
                          {step.description}
                        </span>
                      )}
                    </span>
                  </Tag>
                </>
              ) : (
                <>
                  {stepIdx !== steps.length - 1 ? (
                    <div
                      aria-hidden="true"
                      className="bg-border absolute top-4 left-4 mt-0.5 -ml-px h-full w-0.5"
                    />
                  ) : null}
                  <Tag
                    href={step.href as string}
                    className="group relative flex items-start"
                  >
                    <span aria-hidden="true" className="flex h-9 items-center">
                      <span className="border-border relative z-10 flex size-8 items-center justify-center rounded-full border-2 bg-white">
                        <span className="group-hover:bg-border size-2.5 rounded-full bg-transparent" />
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-4 flex min-w-0 flex-col",
                        !step.description && "self-center",
                      )}
                    >
                      <span className="text-muted-foreground text-base font-medium">
                        {step.name}
                      </span>
                      {step.description && (
                        <span className="text-muted-foreground text-base">
                          {step.description}
                        </span>
                      )}
                    </span>
                  </Tag>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default NamespaceOnboardingProgress;
