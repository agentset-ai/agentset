"use client";

import type { Session } from "@/lib/auth-types";
import { useState } from "react";
import { useSession } from "@/hooks/use-session";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";
import { Loader2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@agentset/ui/alert";
import { Button } from "@agentset/ui/button";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";

async function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EditUser() {
  const { session, isLoading } = useSession();
  if (isLoading || !session) return <div>Loading...</div>;

  return <EditUserForm session={session} />;
}

const EditUserForm = ({ session }: { session: Session }) => {
  const [name, setName] = useState<string>(session.user.name);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    session.user.image || null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [emailVerificationPending, setEmailVerificationPending] =
    useState<boolean>(false);
  const router = useRouter();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setIsLoading(true);
    await authClient.updateUser({
      image: image ? await convertImageToBase64(image) : undefined,
      name: name ? name : undefined,
      fetchOptions: {
        onSuccess: () => {
          toast.success("User updated successfully");
        },
        onError: (error) => {
          toast.error(error.error.message);
        },
      },
    });

    router.refresh();
    setIsLoading(false);
  };

  return (
    <div>
      {session.user.emailVerified ? null : (
        <Alert className="mb-10">
          <AlertTitle>Verify Your Email Address</AlertTitle>
          <AlertDescription className="text-muted-foreground">
            Please verify your email address. Check your inbox for the
            verification email. If you haven't received the email, click the
            button below to resend.
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
          >
            {emailVerificationPending ? (
              <Loader2Icon size={15} className="animate-spin" />
            ) : (
              "Resend Verification Email"
            )}
          </Button>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-10">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            type="name"
            placeholder="Enter your full name"
            value={name}
            required
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={session.user.email} disabled />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="image">Profile Image</Label>
          <div className="flex items-end gap-4">
            {imagePreview && (
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                <img
                  src={imagePreview}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div className="flex w-full items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                value={image ? image.name : ""}
                className="text-muted-foreground w-full"
              />

              {imagePreview && (
                <XIcon
                  className="cursor-pointer"
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <Button type="submit" isLoading={isLoading}>
            Update
          </Button>
        </div>
      </form>
    </div>
  );
};
