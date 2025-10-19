"use client";

import { Avatar as AvatarPrimitive } from "radix-ui";

import { cn } from "@agentset/ui/cn";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex size-8 shrink-0 overflow-hidden rounded-full",
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square size-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "bg-muted flex size-full items-center justify-center rounded-full",
        className,
      )}
      {...props}
    />
  );
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

function EntityAvatar({
  className,
  entity,
  fallbackClassName,
  ...props
}: React.ComponentProps<typeof Avatar> & {
  fallbackClassName?: string;
  entity: {
    id: string;
    logo?: string | null;
    image?: string | null;
    name?: string | null;
  };
}) {
  const logo = entity.logo || entity.image;
  const hasNameOrLogo = logo || entity.name;
  return (
    <Avatar className={cn("size-8 shrink-0 rounded-lg", className)} {...props}>
      {!hasNameOrLogo && (
        <AvatarImage
          src={`https://api.dicebear.com/9.x/glass/svg?seed=${entity.id}`}
        />
      )}

      {logo && <AvatarImage src={logo} />}

      {entity.name && (
        <AvatarFallback
          className={cn(
            "bg-sidebar-primary text-sidebar-primary-foreground rounded-lg",
            fallbackClassName,
          )}
        >
          {getInitials(entity.name)}
        </AvatarFallback>
      )}
    </Avatar>
  );
}

export { Avatar, AvatarImage, AvatarFallback, EntityAvatar };
