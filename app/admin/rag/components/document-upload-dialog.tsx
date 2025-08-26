"use client";

import { useState, useEffect, useRef } from "react";
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
  defaultChunkingStrategyId?: number;
  defaultCleansingConfigId?: number;
}

interface ChunkingStrategy {
  id: number;
  name: string;
  type: string;
  chunkSize: number;
  chunkOverlap: number;
  isDefault: boolean;
}

interface CleansingConfig {
  id: number;
  name: string;
  llmModelId?: number;
  llmModelName?: string;
  removeHeaders: boolean;
  removeFooters: boolean;
  removePageNumbers: boolean;
  normalizeWhitespace: boolean;
  fixEncoding: boolean;
  isDefault: boolean;
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
  const [chunkingStrategies, setChunkingStrategies] = useState<ChunkingStrategy[]>([]);
  const [cleansingConfigs, setCleansingConfigs] = useState<CleansingConfig[]>([]);
  const [selectedChunkingStrategy, setSelectedChunkingStrategy] = useState<string>('use-default');
  const [selectedCleansingConfig, setSelectedCleansingConfig] = useState<string>('use-default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch chunking strategies
  const fetchChunkingStrategies = async () => {
    try {
      const response = await fetch('/api/rag/chunking-strategies');
      if (!response.ok) return;
      const data = await response.json();
      setChunkingStrategies(data.strategies || []);
    } catch (error) {
      console.warn('Error fetching chunking strategies:', error);
    }
  };

  // Fetch cleansing configs
  const fetchCleansingConfigs = async () => {
    try {
      const response = await fetch('/api/rag/cleansing-configs');
      if (!response.ok) return;
      const data = await response.json();
      setCleansingConfigs(data.configs || []);
    } catch (error) {
      console.warn('Error fetching cleansing configs:', error);
    }
  };

  useEffect(() => {
    fetchChunkingStrategies();
    fetchCleansingConfigs();
  }, []);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      // Reset file selection when dialog opens
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Reset collection selection if needed
      if (!selectedCollection && collections.length > 0) {
        setSelectedCollection(collections[0].id.toString());
      }
    }
  }, [open, collections]);

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
      
      // Add override options if selected (and not using default)
      if (selectedChunkingStrategy && selectedChunkingStrategy !== 'use-default') {
        formData.append('chunkingStrategyId', selectedChunkingStrategy);
      }
      if (selectedCleansingConfig && selectedCleansingConfig !== 'use-default') {
        formData.append('cleansingConfigId', selectedCleansingConfig);
      }
      
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
      
      // Replace {{count}} with actual count value
      const successMessage = lang('documents.uploadSuccess').replace('{{count}}', successCount.toString());
      toast.success(successMessage);
      
      // Reset form after successful upload
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onUploadComplete();
      onOpenChange(false); // Close dialog after successful upload
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
                ref={fileInputRef}
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

            <div className="grid gap-2">
              <Label htmlFor="chunkingStrategy">
                {lang('documents.chunkingStrategyOverride')}
              </Label>
              <Select
                value={selectedChunkingStrategy}
                onValueChange={setSelectedChunkingStrategy}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang('documents.useCollectionDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="use-default">{lang('documents.useCollectionDefault')}</SelectItem>
                  {chunkingStrategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id.toString()}>
                      {strategy.name} ({strategy.type}, {strategy.chunkSize} chars)
                      {strategy.isDefault && ` (${lang('default')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cleansingConfig">
                {lang('documents.cleansingConfigOverride')}
              </Label>
              <Select
                value={selectedCleansingConfig}
                onValueChange={setSelectedCleansingConfig}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang('documents.useCollectionDefault')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="use-default">{lang('documents.useCollectionDefault')}</SelectItem>
                  {cleansingConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.name}
                      {config.llmModelName && ` (${config.llmModelName})`}
                      {config.isDefault && ` (${lang('default')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
