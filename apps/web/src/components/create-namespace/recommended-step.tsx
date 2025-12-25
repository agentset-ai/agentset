"use client";

import { useCallback, useState } from "react";
import { SparklesIcon } from "lucide-react";

import { Button } from "@agentset/ui/button";
import { OpenAIIcon } from "@agentset/ui/icons/openai";
import { TurbopufferIcon } from "@agentset/ui/icons/turbopuffer";
import { Input } from "@agentset/ui/input";
import { Label } from "@agentset/ui/label";

import { SlugInput } from "./slug-input";

interface RecommendedStepProps {
  orgId: string;
  defaultName: string;
  defaultSlug: string;
  onContinue: (name: string, slug: string) => void;
  onCustomize: (name: string, slug: string) => void;
}

export function RecommendedStep({
  orgId,
  defaultName,
  defaultSlug,
  onContinue,
  onCustomize,
}: RecommendedStepProps) {
  const [name, setName] = useState(defaultName);
  const [slug, setSlug] = useState(defaultSlug);
  const [isSlugValid, setIsSlugValid] = useState<boolean | null>(null);
  const [isSlugValidating, setIsSlugValidating] = useState(false);

  const handleSlugValidationChange = useCallback(
    (isValid: boolean | null, isValidating: boolean) => {
      setIsSlugValid(isValid);
      setIsSlugValidating(isValidating);
    },
    [],
  );

  const canProceed = name.trim().length > 0 && isSlugValid === true;

  return (
    <div className="space-y-6">
      {/* Name Input */}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Namespace"
          autoFocus
        />
      </div>

      {/* Slug Input */}
      <SlugInput
        orgId={orgId}
        name={name}
        value={slug}
        onChange={setSlug}
        onValidationChange={handleSlugValidationChange}
      />

      {/* Recommended Configuration Display */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="text-primary h-4 w-4" />
          <Label className="text-sm font-medium">
            Recommended Configuration
          </Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Embedding Model Card */}
          <div className="from-muted/50 to-muted rounded-xl border bg-gradient-to-br p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Embedding
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-background flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm">
                <OpenAIIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">OpenAI</div>
                <div className="text-muted-foreground truncate text-sm">
                  text-embedding-3-large
                </div>
              </div>
            </div>
          </div>

          {/* Vector Store Card */}
          <div className="from-muted/50 to-muted rounded-xl border bg-gradient-to-br p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
                Vector Store
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-background flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm">
                <TurbopufferIcon className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Turbopuffer</div>
                <div className="text-muted-foreground truncate text-sm">
                  Managed & optimized
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="text-muted-foreground text-xs">
          These settings are optimized for most use cases and cannot be changed
          later.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => onCustomize(name, slug)}
          disabled={!canProceed || isSlugValidating}
        >
          Customize
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={() => onContinue(name, slug)}
          disabled={!canProceed || isSlugValidating}
        >
          Continue with Recommended
        </Button>
      </div>
    </div>
  );
}
