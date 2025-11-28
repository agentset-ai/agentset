import type { UseFormProps } from "react-hook-form";
import type { z } from "zod/v4";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

export const useZodForm = <T extends z.ZodType<any, any>>(
  schema: T,
  options?: Omit<UseFormProps<z.infer<T>>, "resolver">,
) => {
  return useForm<z.infer<T>>({
    resolver: zodResolver(schema) as any,
    ...options,
  });
};
