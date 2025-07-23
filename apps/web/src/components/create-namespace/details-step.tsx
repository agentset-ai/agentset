"use client";

import { useEffect, useMemo } from "react";
import { useOrganization } from "@/contexts/organization-context";
import { toSlug } from "@/lib/slug";
import { trpcClient } from "@/trpc/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import {
  Button,
  DialogFooter,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@agentset/ui";

const createFormSchema = (orgId: string) =>
  z.object({
    name: z.string().min(1),
    slug: z
      .string()
      .min(1)
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .refine(
        async (value) => {
          if (value === "") return false;
          const result = await trpcClient.namespace.checkSlug.query({
            slug: value,
            orgId,
          });
          return !result;
        },
        { message: "Slug is already taken" },
      ),
  });
type FormSchema = z.infer<ReturnType<typeof createFormSchema>>;

export default function CreateNamespaceDetailsStep({
  onSubmit,
  defaultValues,
}: {
  onSubmit: (values: FormSchema) => void;
  defaultValues: Partial<FormSchema>;
}) {
  const { activeOrganization } = useOrganization();
  const formSchema = useMemo(
    () => createFormSchema(activeOrganization.id),
    [activeOrganization.id],
  );

  const form = useForm({
    resolver: zodResolver(formSchema, undefined, { mode: "async" }),
    reValidateMode: "onBlur",
    defaultValues: {
      name: "",
      slug: "",
      ...defaultValues,
    },
  });

  const name = form.watch("name");
  const { formState, setValue } = form;
  useEffect(() => {
    if (!formState.touchedFields.slug) {
      setValue("slug", toSlug(name));
    }
  }, [name, formState, setValue]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Example" {...field} />
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
                  <Input placeholder="example" {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter className="mt-6">
          <Button type="submit">Next</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
