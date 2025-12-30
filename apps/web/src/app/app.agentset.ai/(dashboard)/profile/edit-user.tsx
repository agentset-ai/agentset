"use client";

import type { Session } from "@/lib/auth-types";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Alert, AlertDescription, AlertTitle } from "@agentset/ui/alert";
import { AvatarUploader } from "@agentset/ui/avatar-uploader";
import { Button } from "@agentset/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import { Skeleton } from "@agentset/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditUser() {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <EditUserSkeleton />;
  }

  if (!session) {
    return null;
  }

  return <EditUserForm session={session} />;
}

function EditUserSkeleton() {
  return (
    <div className="flex max-w-md flex-col gap-6">
      <Skeleton className="size-16 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="h-10 w-20" />
    </div>
  );
}

const EditUserForm = ({ session }: { session: Session }) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [emailVerificationPending, setEmailVerificationPending] =
    useState<boolean>(false);
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: session.user.name || "",
    },
  });

  const { mutate: updateUser, isPending } = useMutation({
    mutationFn: async (data: FormValues) => {
      return authClient.updateUser({
        image: imageBase64 ?? undefined,
        name: data.name,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: () => {
      toast.success("Profile updated successfully");
      form.reset({ name: form.getValues("name") });
      setImageBase64(null);
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const onSubmit = (data: FormValues) => {
    updateUser(data);
  };

  const isDirty = form.formState.isDirty || imageBase64 !== null;

  return (
    <div className="flex flex-col gap-6">
      {!session.user.emailVerified && (
        <Alert>
          <AlertTitle>Verify Your Email Address</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Please verify your email address. Check your inbox for the
            verification email. If you haven't received the email, click the
            button below to resend.
          </AlertDescription>
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
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
          >
            {emailVerificationPending ? (
              <Loader2Icon size={15} className="animate-spin" />
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </Alert>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex max-w-md flex-col gap-6"
        >
          <div className="flex flex-col gap-2">
            <FormLabel>Profile Picture</FormLabel>
            <AvatarUploader
              defaultImageUrl={session.user.image}
              onImageChange={(image) => setImageBase64(image)}
            />
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-2">
            <FormLabel>Email</FormLabel>
            <Input type="email" value={session.user.email} disabled />
            <p className="text-muted-foreground text-sm">
              Email cannot be changed.
            </p>
          </div>

          <Button
            type="submit"
            className="w-fit"
            disabled={!isDirty}
            isLoading={isPending}
          >
            Save Changes
          </Button>
        </form>
      </Form>
    </div>
  );
};
