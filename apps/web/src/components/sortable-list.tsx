import type { DragEndEvent } from "@dnd-kit/core";
import type {
  FieldArrayPath,
  FieldPathByValue,
  UseFormReturn,
} from "react-hook-form";
import { useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVerticalIcon, PlusIcon, XIcon } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import { Button } from "@agentset/ui/button";
import { cn } from "@agentset/ui/cn";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@agentset/ui/form";
import { Input } from "@agentset/ui/input";

// Virtual ID type for sortable items
type VirtualId = string;

export default function SortableList<T extends object>({
  form,
  name,
  label,
  maxItems,
}: {
  form: UseFormReturn<T>;
  name: FieldPathByValue<T, string[]> | FieldArrayPath<T>;
  label: string;
  maxItems?: number;
}) {
  const typedName = name as FieldArrayPath<T>;
  const [virtualIds, setVirtualIds] = useState<VirtualId[]>(() =>
    form.getValues(typedName).map((_, index) => `item-${index}-${Date.now()}`),
  );

  const { fields, append, remove, move } = useFieldArray<T, typeof typedName>({
    control: form.control,
    name: typedName,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleAdd = () => {
    // Check if the last example is empty
    const values = form.getValues(typedName);
    const lastValue = values.at(-1);
    if (lastValue === "") {
      form.setError(`${typedName}.${values.length - 1}`, {
        type: "manual",
        message: "Please fill in the current item before adding a new one",
      });
      return;
    }

    // Add new virtual ID when adding an example
    append("" as any); // TODO: make this dynamic based on type
    setVirtualIds((prev) => [...prev, `item-${prev.length}-${Date.now()}`]);
  };

  const handleRemove = (index: number) => {
    // Remove virtual ID when removing an example
    setVirtualIds((prev) => prev.filter((_, i) => i !== index));
    remove(index);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((_, i) => virtualIds[i] === active.id);
      const newIndex = fields.findIndex((_, i) => virtualIds[i] === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        move(oldIndex, newIndex);
        // Update virtual IDs order
        setVirtualIds((prev) => {
          const newIds = [...prev];
          const [movedId] = newIds.splice(oldIndex, 1);
          newIds.splice(newIndex, 0, movedId!);
          return newIds;
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-5">
        <FormLabel>{label}</FormLabel>
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={virtualIds}
          strategy={verticalListSortingStrategy}
        >
          {fields.map((_, index) => {
            const virtualId = virtualIds[index];
            if (!virtualId) return null;

            return (
              <FormField
                key={virtualId}
                name={`${typedName}.${index}`}
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <SortableItem
                      id={virtualId}
                      inputProps={field}
                      onRemove={() => handleRemove(index)}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableItem({
  id,
  inputProps,
  onRemove,
}: {
  id: string;
  onRemove: () => void;
  inputProps?: React.ComponentProps<typeof Input>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border p-2",
        isDragging ? "bg-accent shadow-lg" : "",
      )}
    >
      <div
        className="cursor-grab touch-none"
        ref={setNodeRef}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="text-muted-foreground h-4 w-4" />
      </div>

      <FormControl>
        <Input
          placeholder="Enter an example..."
          className="flex-1"
          {...inputProps}
        />
      </FormControl>

      <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
        <XIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}
