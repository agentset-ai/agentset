"use client";

import { useState } from "react";

import { Button } from "@agentset/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@agentset/ui/dialog";
import { Input } from "@agentset/ui/input";

interface DeleteConfirmationProps {
  trigger: React.ReactNode;
  title?: string;
  description?: string;
  confirmText?: string;
  onConfirm: () => void;
  className?: string;
}

export function DeleteConfirmation({
  trigger,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText,
  onConfirm,
  className,
}: DeleteConfirmationProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
    setInputValue("");
  };

  const isConfirmDisabled = confirmText ? inputValue !== confirmText : false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className={className}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {confirmText && (
          <div className="py-4">
            <p className="text-muted-foreground mb-2 text-sm">
              Please type <span className="font-semibold">{confirmText}</span>{" "}
              to confirm
            </p>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={confirmText}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              setInputValue("");
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
