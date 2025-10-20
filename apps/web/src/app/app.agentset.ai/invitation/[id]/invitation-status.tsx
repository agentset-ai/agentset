import Link from "next/link";

import { Button } from "@agentset/ui/button";
import { Card, CardContent, CardFooter } from "@agentset/ui/card";
import { cn } from "@agentset/ui/cn";

export const InvitationStatus = ({
  icon: Icon,
  iconContainerClassName,
  iconClassName,
  title,
  description,
  action,
}: {
  icon: React.ElementType;
  iconContainerClassName?: string;
  iconClassName?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}) => {
  return (
    <Card className="w-full max-w-md gap-2 shadow-lg">
      <CardContent>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className={cn("rounded-full p-3", iconContainerClassName)}>
            <Icon className={cn("h-8 w-8", iconClassName)} />
          </div>

          <h3 className="mt-6 text-xl font-medium">{title}</h3>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
      </CardContent>

      {action && (
        <CardFooter className="flex justify-center">
          <Button asChild className="w-auto">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};
