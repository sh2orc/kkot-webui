"use client";

import { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Copy } from "lucide-react";

interface Collection {
  id: number;
  name: string;
}

interface CollectionCopyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  onCopyComplete: () => void;
}

export function CollectionCopyDialog({
  open,
  onOpenChange,
  collections,
  onCopyComplete,
}: CollectionCopyDialogProps) {
  const { lang } = useTranslation('admin.rag');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    sourceCollectionId: '',
    newCollectionName: '',
    copyDocuments: true,
    copyVectors: true,
  });

  const handleSubmit = async () => {
    if (!formData.sourceCollectionId || !formData.newCollectionName.trim()) {
      toast.error(lang('collections.copyDialog.requiredFieldsError'));
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/rag/collections/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceCollectionId: parseInt(formData.sourceCollectionId),
          newCollectionName: formData.newCollectionName.trim(),
          copyDocuments: formData.copyDocuments,
          copyVectors: formData.copyVectors,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to copy collection');
      }

      toast.success(lang('collections.copySuccess'));
      onCopyComplete();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        sourceCollectionId: '',
        newCollectionName: '',
        copyDocuments: true,
        copyVectors: true,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : lang('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            {lang('collections.copyDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {lang('collections.copyDialog.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="source">{lang('collections.sourceCollection')}</Label>
            <Select
              value={formData.sourceCollectionId}
              onValueChange={(value) => setFormData({ ...formData, sourceCollectionId: value })}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder={lang('collections.copyDialog.sourceCollectionPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id.toString()}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="name">{lang('collections.newName')}</Label>
            <Input
              id="name"
              value={formData.newCollectionName}
              onChange={(e) => setFormData({ ...formData, newCollectionName: e.target.value })}
              placeholder={lang('collections.copyDialog.newNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{lang('collections.copyOptions')}</Label>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyDocuments"
                checked={formData.copyDocuments}
                onCheckedChange={(checked) => setFormData({ ...formData, copyDocuments: checked as boolean })}
              />
              <Label
                htmlFor="copyDocuments"
                className="text-sm font-normal cursor-pointer"
              >
                {lang('collections.copyDocuments')}
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="copyVectors"
                checked={formData.copyVectors}
                onCheckedChange={(checked) => setFormData({ ...formData, copyVectors: checked as boolean })}
              />
              <Label
                htmlFor="copyVectors"
                className="text-sm font-normal cursor-pointer"
              >
                {lang('collections.copyVectors')}
              </Label>
            </div>
          </div>

          {formData.sourceCollectionId && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {formData.copyDocuments && formData.copyVectors ? (
                  lang('collections.copyDialog.copyResult.both')
                ) : formData.copyDocuments ? (
                  lang('collections.copyDialog.copyResult.documentsOnly')
                ) : formData.copyVectors ? (
                  lang('collections.copyDialog.copyResult.vectorsOnly')
                ) : (
                  lang('collections.copyDialog.copyResult.empty')
                )}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {lang('cancel')}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.sourceCollectionId || !formData.newCollectionName.trim()}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang('collections.copy')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
