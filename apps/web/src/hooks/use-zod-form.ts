import type { UseFormProps } from "react-hook-form";
import type { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const useZodForm = <T extends z.ZodType<any, any>>(
  schema: T,
  options?: Omit<UseFormProps<z.infer<T>>, "resolver">,
  schemaOptions?: Parameters<typeof zodResolver>[1],
  resolverOptions?: Partial<Parameters<typeof zodResolver>[2]>,
) => {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema, schemaOptions, resolverOptions as any) as any,
    ...options,
  });
};
