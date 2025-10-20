"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { LLM, LLM_MODELS } from "@agentset/validation";

interface LLMSelectorProps {
  value?: LLM;
  onValueChange: (value: LLM) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function LLMSelector({
  value,
  onValueChange,
  placeholder = "Select LLM model",
  disabled = false,
}: LLMSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onValueChange(value as LLM)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(LLM_MODELS).flatMap(([provider, models]) =>
          models.map((m) => (
            <SelectItem
              key={`${provider}:${m.model}`}
              value={`${provider}:${m.model}`}
            >
              {m.name}
            </SelectItem>
          )),
        )}
      </SelectContent>
    </Select>
  );
}
