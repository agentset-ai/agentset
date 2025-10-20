"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@agentset/ui/select";
import { RERANKER_MODELS, RerankingModel } from "@agentset/validation";

interface RerankerSelectorProps {
  value?: RerankingModel;
  onValueChange: (value: RerankingModel) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RerankerSelector({
  value,
  onValueChange,
  placeholder = "Select re-ranker model",
  disabled = false,
}: RerankerSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={(value) => onValueChange(value as RerankingModel)}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(RERANKER_MODELS).flatMap(([provider, models]) =>
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
