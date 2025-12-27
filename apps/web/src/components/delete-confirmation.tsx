"use client";

import { useState } from "react";
import { AlertTriangleIcon } from "lucide-react";

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
  isLoading?: boolean;
}

/**
 * Renders an uncontrolled delete confirmation dialog that opens from the given trigger.
 *
 * The dialog manages its own open state, optionally requires the user to type a confirmation string
 * before enabling the destructive action, and resets the confirmation input when closed or confirmed.
 *
 * @param trigger - Element that opens the dialog when activated
 * @param title - Dialog title (defaults to "Are you sure?")
 * @param description - Dialog description (defaults to "This action cannot be undone.")
 * @param confirmText - When provided, user must type this exact text to enable the Delete button
 * @param onConfirm - Callback invoked when the user confirms deletion
 * @param className - Optional className applied to the dialog content container
 * @param isLoading - When true, shows a loading state on the destructive Delete button
 * @returns The rendered confirmation dialog element
 */
export function DeleteConfirmation({
  trigger,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText,
  onConfirm,
  className,
  isLoading,
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
            isLoading={isLoading}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Controlled version of DeleteConfirmation for use with dropdown menus
 * or other components that need external state management.
 */
interface DeleteConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  itemName: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Render a controlled delete confirmation dialog that requires typing the item name to confirm.
 *
 * The dialog displays a title, an optional description, and an input that must match `itemName` to enable the destructive action.
 * When the dialog is closed, the input is cleared. Confirming triggers `onConfirm` and also clears the input.
 *
 * @param open - Whether the dialog is visible
 * @param onOpenChange - Callback invoked when the dialog open state should change
 * @param title - Dialog title shown in the header
 * @param description - Optional descriptive text shown under the title; a default warning is used when omitted
 * @param itemName - The exact text the user must type to enable confirmation
 * @param onConfirm - Callback invoked when the user confirms deletion
 * @param isLoading - When true, shows a loading state on the destructive button and disables confirmation
 * @returns The delete confirmation dialog React element
 */
export function DeleteConfirmationDialog({
  open,
  onOpenChange,
  title = "Delete item",
  description,
  itemName,
  onConfirm,
  isLoading,
}: DeleteConfirmationDialogProps) {
  const [inputValue, setInputValue] = useState("");

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
    if (!newOpen) {
      setInputValue("");
    }
  };

  const handleConfirm = () => {
    onConfirm();
    setInputValue("");
  };

  const isConfirmDisabled = inputValue !== itemName;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="text-destructive size-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description ??
              "This action cannot be undone. This will permanently delete this item and all associated data."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm">
            To confirm, type{" "}
            <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-sm font-semibold">
              {itemName}
            </span>{" "}
            below:
          </p>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={itemName}
            autoComplete="off"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isConfirmDisabled || isLoading}
            isLoading={isLoading}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}