"use client";

import { Fragment, useEffect, useState } from "react";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { PencilIcon, RotateCcwIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { Button } from "@agentset/ui/button";
import { DialogFooter } from "@agentset/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";
import { generateToken, toSlug } from "@agentset/utils";

const formSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .refine(
      async (value) => {
        const result = await authClient.organization.checkSlug({
          slug: value,
        });

        return !!result.data?.status;
      },
      { message: "Slug is already taken" },
    ),
});

export function CreateOrgForm({
  isDialog,
  onSuccess,
}: {
  isDialog?: boolean;
  onSuccess?(): void;
}) {
  const router = useRouter();
  const [hashSuffix] = useState(() => generateToken(4).toLowerCase());
  const [isEditingSlug, setIsEditingSlug] = useState(false);

  const form = useForm({
    resolver: zodResolver(formSchema, undefined, { mode: "async" }),
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      slug: "",
    },
  });

  const { mutateAsync: createOrganization, isPending: isCreatingOrganization } =
    useMutation({
      mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
        const response = await authClient.organization.create({
          name,
          slug,
        });

        if (!response.data) {
          throw new Error(response.error.message);
        }

        return response.data;
      },
      onSuccess: (data) => {
        logEvent("organization_created", {
          slug: data.slug,
          name: data.name,
        });
        router.push(`/${data.slug}`);
        onSuccess?.();
        form.reset();
      },
      onError: (error) => {
        console.error(error);
        toast.error("Failed to create organization");
      },
    });

  const name = form.watch("name");
  const slug = form.watch("slug");
  const { formState, setValue } = form;

  useEffect(() => {
    if (!formState.touchedFields.slug) {
      const baseSlug = toSlug(name);
      setValue("slug", baseSlug ? `${baseSlug}-${hashSuffix}` : "");
    }
  }, [name, formState.touchedFields.slug, setValue, hashSuffix]);

  function resetToAutoSlug() {
    setIsEditingSlug(false);
    const baseSlug = toSlug(form.getValues("name"));
    const newSlug = baseSlug ? `${baseSlug}-${hashSuffix}` : "";
    form.resetField("slug", { defaultValue: newSlug });
    setValue("slug", newSlug);
  }

  function enableSlugEditing() {
    setIsEditingSlug(true);
    form.setValue("slug", slug, { shouldTouch: true });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createOrganization(values);
  };

  const SubmitWrapper = isDialog ? DialogFooter : Fragment;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditingSlug ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    {slug || "my-organization"}
                  </span>
                  <button
                    type="button"
                    onClick={enableSlugEditing}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Edit slug"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
                {formState.errors.slug && (
                  <p className="text-destructive text-sm">
                    {formState.errors.slug.message}
                  </p>
                )}
              </div>
            ) : (
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="my-organization" {...field} />
                    </FormControl>
                    <button
                      type="button"
                      onClick={resetToAutoSlug}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
                    >
                      <RotateCcwIcon className="h-3 w-3" />
                      Auto generate
                    </button>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>

          <SubmitWrapper>
            <Button
              type="submit"
              className="w-full"
              isLoading={isCreatingOrganization}
            >
              Get Started
            </Button>
          </SubmitWrapper>
        </div>
      </form>
    </Form>
  );
}
