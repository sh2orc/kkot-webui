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
      toast.error('모든 필수 필드를 입력해주세요.');
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

      toast.success(lang('collections.copySuccess') || '컬렉션이 복사되었습니다.');
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
            {lang('collections.copy') || '컬렉션 복사'}
          </DialogTitle>
          <DialogDescription>
            기존 컬렉션을 복사하여 새로운 컬렉션을 생성합니다.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="source">{lang('collections.sourceCollection') || '원본 컬렉션'}</Label>
            <Select
              value={formData.sourceCollectionId}
              onValueChange={(value) => setFormData({ ...formData, sourceCollectionId: value })}
            >
              <SelectTrigger id="source">
                <SelectValue placeholder="복사할 컬렉션을 선택하세요" />
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
            <Label htmlFor="name">{lang('collections.newName') || '새 컬렉션 이름'}</Label>
            <Input
              id="name"
              value={formData.newCollectionName}
              onChange={(e) => setFormData({ ...formData, newCollectionName: e.target.value })}
              placeholder="예: 복사된 컬렉션"
            />
          </div>

          <div className="space-y-2">
            <Label>{lang('collections.copyOptions') || '복사 옵션'}</Label>
            
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
                {lang('collections.copyDocuments') || '문서 복사'}
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
                {lang('collections.copyVectors') || '벡터 데이터 복사'}
              </Label>
            </div>
          </div>

          {formData.sourceCollectionId && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-sm text-muted-foreground">
                {formData.copyDocuments && formData.copyVectors ? (
                  '문서와 벡터 데이터가 모두 복사됩니다.'
                ) : formData.copyDocuments ? (
                  '문서만 복사되며, 벡터는 재생성해야 합니다.'
                ) : formData.copyVectors ? (
                  '벡터 데이터만 복사됩니다.'
                ) : (
                  '빈 컬렉션이 생성됩니다.'
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
            {lang('collections.copy') || '복사'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
