"use client";

import { useMemo } from "react";
import { useOrganization } from "@/contexts/organization-context";
import { authClient } from "@/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";

import {
  Button,
  EntityAvatar,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@agentset/ui";

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
  const { activeOrganization, setActiveOrganization } = useOrganization();
  const formSchema = useMemo(
    () => makeFormSchema(activeOrganization.slug),
    [activeOrganization.slug],
  );

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: activeOrganization.name,
      slug: activeOrganization.slug,
    },
  });

  const { mutateAsync: updateOrganization, isPending } = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return authClient.organization.update({
        organizationId: activeOrganization.id,
        data: {
          name: data.name,
          slug: data.slug,
        },
      });
    },
    onSuccess: (data) => {
      if (data.data) {
        setActiveOrganization({
          ...activeOrganization,
          name: data.data.name,
          slug: data.data.slug,
        });
      }
      toast.success("Organization updated");
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
          entity={activeOrganization}
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
