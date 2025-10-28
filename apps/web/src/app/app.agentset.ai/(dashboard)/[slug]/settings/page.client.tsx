"use client";

import { useMemo } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { logEvent } from "@/lib/analytics";
import { authClient } from "@/lib/auth-client";
import { useTRPC } from "@/trpc/react";
import { useRouter } from "@bprogress/next/app";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import { EntityAvatar } from "@agentset/ui/avatar";
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

const makeFormSchema = (currentSlug: string) =>
  z.object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine(
        async (value) => {
          if (value === currentSlug) {
            return true;
          }

          const result = await authClient.organization.checkSlug({
            slug: value,
          });

          return !!result.data?.status;
        },
        { message: "Slug is already taken" },
      ),
  });

export default function SettingsPage() {
  const organization = useOrganization();
  const router = useRouter();
  const formSchema = useMemo(
    () => makeFormSchema(organization.slug),
    [organization.slug],
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
    },
  });

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutateAsync: updateOrganization, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return authClient.organization.update({
        organizationId: organization.id,
        data: {
          name: data.name,
          slug: data.slug,
        },
        fetchOptions: { throw: true },
      });
    },
    onSuccess: (data) => {
      logEvent("organization_updated", {
        id: organization.id,
        nameChanged: organization.name !== data.name,
        slugChanged: organization.slug !== data.slug,
      });

      // Invalidate the organization query to refetch updated data
      queryClient.invalidateQueries(
        trpc.organization.getBySlug.queryFilter({
          slug: organization.slug,
        }),
      );
      toast.success("Organization updated");

      // if slug changed, redirect to the new slug
      if (organization.slug !== data.slug) {
        router.replace(`/${data.slug}/settings`);
      }
    },
    onError: () => {
      toast.error("Failed to update organization");
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    void updateOrganization(data);
  };

  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex max-w-md flex-col gap-8"
      >
        <EntityAvatar
          entity={organization}
          className="size-14"
          fallbackClassName="text-xl"
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="mt-2 w-fit"
          disabled={!isDirty}
          isLoading={isPending}
        >
          Save
        </Button>
      </form>
    </Form>
  );
}
