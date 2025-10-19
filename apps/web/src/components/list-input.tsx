import type {
  FieldArrayPath,
  FieldPathByValue,
  UseFormReturn,
} from "react-hook-form";
import { PlusIcon, XIcon } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import { Button } from "@agentset/ui/button";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";

export default function ListInput<
  T extends object,
  K extends FieldPathByValue<T, string[]> | FieldArrayPath<T>,
>({
  form,
  name,
  label,
  description,
  maxItems,
  placeholder = "Enter an item...",
}: {
  form: UseFormReturn<T>;
  name: K;
  label?: string;
  description?: string;
  maxItems?: number;
  placeholder?: string;
}) {
  const typedName = name as FieldArrayPath<T>;

  const { fields, append, remove } = useFieldArray<T, typeof typedName>({
    control: form.control,
    name: typedName,
  });

  const handleAdd = () => {
    // Check if the last item is empty
    const items = form.getValues(typedName);
    const lastItem = items.at(-1);
    if (lastItem === "") {
      form.setError(`${typedName}.${items.length - 1}`, {
        type: "manual",
        message: "Please fill in the current item before adding a new one",
      });
      return;
    }

    append("" as any);
  };

  const handleRemove = (index: number) => {
    remove(index);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-5">
        <div className="flex flex-col gap-1">
          {label && <FormLabel>{label}</FormLabel>}
          {description && <FormDescription>{description}</FormDescription>}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAdd}
          disabled={!!maxItems && fields.length >= maxItems}
        >
          <PlusIcon className="size-4" />
          Add
        </Button>
      </div>

      {fields.map((_, index) => (
        <FormField
          key={index}
          name={`${typedName}.${index}`}
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2 rounded-md border p-2">
                <FormControl>
                  <Input
                    placeholder={placeholder}
                    className="flex-1"
                    {...field}
                  />
                </FormControl>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(index)}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}
    </div>
  );
}
