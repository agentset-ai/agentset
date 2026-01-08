"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@agentset/ui/alert";
import { AvatarUploader } from "@agentset/ui/avatar-uploader";
import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import { Input } from "@agentset/ui/input";
import { Skeleton } from "@agentset/ui/skeleton";

function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; image?: string }) => {
      return authClient.updateUser({
        ...data,
        fetchOptions: {
          throw: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("User updated successfully");
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
}

function NameForm() {
  const { session, isLoading } = useSession();
  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } =
    useUpdateProfile();
  const [name, setName] = useState<string>(session?.user.name || "");

  useEffect(() => {
    setName(session?.user.name || "");
  }, [session?.user.name]);

  return (
    <FormCard
      title="Full Name"
      description="Enter your full name"
      isSubmitting={isUpdatingProfile}
      isLoading={isLoading}
      onSubmit={() => updateProfile({ name })}
      submitButton={{
        disabled: !name || name === session?.user.name,
      }}
    >
      <Input
        id="name"
        type="name"
        placeholder="Enter your full name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </FormCard>
  );
}

function EmailForm() {
  const { session, isLoading } = useSession();

  return (
    <FormCard
      title="Email"
      description="Enter your email address"
      isLoading={isLoading}
      submitButton={{
        disabled: true,
      }}
    >
      <Input id="email" type="email" value={session?.user.email} disabled />
    </FormCard>
  );
}

function ImageForm() {
  const { session, isLoading } = useSession();
  const [image, setImage] = useState<string | null>(
    session?.user.image || null,
  );

  useEffect(() => {
    setImage(session?.user.image || null);
  }, [session?.user.image]);

  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } =
    useUpdateProfile();

  return (
    <FormCard
      title="Profile Image"
      description={
        <>
          This is your avatar image on your Agentset account.
          <br />
          Click your avatar to upload a new image.
        </>
      }
      isSubmitting={isUpdatingProfile}
      isLoading={isLoading}
      skeleton={<Skeleton className="size-25 rounded-full" />}
      flex="row"
      onSubmit={() => {
        if (image) {
          updateProfile({ image });
        }
      }}
      submitButton={{
        disabled: !image || image === session?.user.image,
      }}
    >
      <AvatarUploader
        defaultImageUrl={image}
        onImageChange={setImage}
        size="lg"
      />
    </FormCard>
  );
}

function EmailVerificationForm() {
  const { session } = useSession();
  const [emailVerificationPending, setEmailVerificationPending] =
    useState<boolean>(false);

  if (!session || session.user.emailVerified) return null;

  return (
    <Alert>
      <AlertTitle>Verify Your Email Address</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        Please verify your email address. Check your inbox for the verification
        email. If you haven't received the email, click the button below to
        resend.
      </AlertDescription>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2"
        onClick={async () => {
          await authClient.sendVerificationEmail(
            {
              email: session.user.email,
            },
            {
              onRequest() {
                setEmailVerificationPending(true);
              },
              onError(context) {
                toast.error(context.error.message);
                setEmailVerificationPending(false);
              },
              onSuccess() {
                toast.success("Verification email sent successfully");
                setEmailVerificationPending(false);
              },
            },
          );
        }}
        isLoading={emailVerificationPending}
      >
        Resend Verification Email
      </Button>
    </Alert>
  );
}

export default function PageClient() {
  return (
    <div>
      <div className="flex flex-col gap-10">
        <EmailVerificationForm />
        <NameForm />
        <ImageForm />
        <EmailForm />
      </div>
    </div>
  );
}

const FormCard = ({
  children,
  className,
  title,
  description,
  submitButton,
  isSubmitting,
  isLoading,
  skeleton,
  flex = "col",
  onSubmit,
  ...props
}: React.ComponentProps<"form"> & {
  title: string;
  description?: string | React.ReactNode;
  submitButton?: {
    text?: string;
    disabled?: boolean;
  };
  skeleton?: React.ReactNode;
  flex?: "row" | "col";
  isLoading?: boolean;
  isSubmitting?: boolean;
}) => {
  return (
    <form
      className={cn("bg-background rounded-xl border", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(e);
      }}
      {...props}
    >
      <div
        className={cn(
          "flex gap-6 p-6 [&>input]:max-w-md",
          flex === "col" ? "flex-col" : "flex-row justify-between",
        )}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground text-sm">{description}</p>
          )}
        </div>

        {isLoading
          ? skeleton || <Skeleton className="h-9 w-full max-w-md" />
          : children}
      </div>

      <div className="bg-muted flex flex-col items-start justify-end gap-4 rounded-b-xl border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:space-y-0 sm:py-3">
        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={submitButton?.disabled}
        >
          {submitButton?.text || "Save"}
        </Button>
      </div>
    </form>
  );
};
