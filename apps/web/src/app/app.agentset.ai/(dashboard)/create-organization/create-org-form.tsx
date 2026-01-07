"use client";

import { Fragment, useEffect } from "react";
import { useZodForm } from "@/hooks/use-zod-form";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "@bprogress/next/app";
import { useMutation } from "@tanstack/react-query";
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
import { toSlug } from "@agentset/utils";

const formSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
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
  className,
}: {
  isDialog?: boolean;
  onSuccess?(): void;
  className?: string;
}) {
  const router = useRouter();
  const form = useZodForm(
    formSchema,
    {
      reValidateMode: "onBlur",
      defaultValues: {
        name: "",
        slug: "",
      },
    },
    undefined,
    { mode: "async" },
  );

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
  const { formState, setValue } = form;

  useEffect(() => {
    if (!formState.touchedFields.slug) {
      setValue("slug", toSlug(name));
    }
  }, [name, formState.touchedFields.slug, setValue]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await createOrganization(values);
  };

  const SubmitWrapper = isDialog ? DialogFooter : Fragment;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Organization" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug</FormLabel>
                  <FormControl>
                    <Input placeholder="my-organization" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <SubmitWrapper>
            <Button
              type="submit"
              className="w-full"
              isLoading={isCreatingOrganization}
            >
              Create Organization
            </Button>
          </SubmitWrapper>
        </div>
      </form>
    </Form>
  );
}
