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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, File } from "lucide-react";
import { toast } from "sonner";

interface Collection {
  id: number;
  name: string;
}

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collections: Collection[];
  onUploadComplete: () => void;
}

export function DocumentUploadDialog({
  open,
  onOpenChange,
  collections,
  onUploadComplete,
}: DocumentUploadDialogProps) {
  const { lang } = useTranslation('admin.rag');
  const [loading, setLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error(lang('documents.noFilesSelected'));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('collectionId', selectedCollection);
      
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/rag/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }

      const result = await response.json();
      const successCount = result.results.filter((r: any) => r.status !== 'failed').length;
      
      toast.success(lang('documents.uploadSuccess', { count: successCount }));
      onUploadComplete();
    } catch (error) {
      toast.error(lang('documents.uploadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{lang('documents.uploadTitle')}</DialogTitle>
            <DialogDescription>
              {lang('documents.uploadDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="collection">{lang('documents.collection')}</Label>
              <Select
                value={selectedCollection}
                onValueChange={setSelectedCollection}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang('documents.selectCollection')} />
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
              <Label htmlFor="files">{lang('documents.files')}</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.html,.md,.csv,.json"
                onChange={(e) => setSelectedFiles(e.target.files)}
                required
              />
              <p className="text-sm text-muted-foreground">
                {lang('documents.supportedFormats')}
              </p>
            </div>

            {selectedFiles && selectedFiles.length > 0 && (
              <div className="grid gap-2">
                <Label>{lang('documents.selectedFiles')}</Label>
                <div className="space-y-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <File className="h-4 w-4" />
                      <span>{file.name}</span>
                      <span className="text-muted-foreground">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {lang('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !selectedFiles}>
              {loading ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-pulse" />
                  {lang('uploading')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {lang('upload')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
