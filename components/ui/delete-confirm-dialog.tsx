"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/i18n";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  translationKey?: string; // For dynamic translation keys like 'admin.rag', 'admin.users' etc.
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  translationKey = "common",
}: DeleteConfirmDialogProps) {
  const { lang } = useTranslation(translationKey);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Delete operation failed:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title || lang("delete")}</DialogTitle>
          <DialogDescription>
            {description || lang("confirmDelete")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            {cancelText || lang("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? lang("deleting") : (confirmText || lang("delete"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
