"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Document {
  id: number;
  title: string;
  collectionId: number;
  metadata?: string;
}

interface Collection {
  id: number;
  name: string;
}

interface ChunkingStrategy {
  id: number;
  name: string;
  type: string;
  isDefault: boolean;
}

interface CleansingConfig {
  id: number;
  name: string;
  isDefault: boolean;
}

interface DocumentRegenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  collections: Collection[];
  onRegenerateComplete: () => void;
}

export function DocumentRegenerateDialog({
  open,
  onOpenChange,
  document,
  collections,
  onRegenerateComplete,
}: DocumentRegenerateDialogProps) {
  const { lang } = useTranslation('admin.rag');
  const [loading, setLoading] = useState(false);
  const [chunkingStrategies, setChunkingStrategies] = useState<ChunkingStrategy[]>([]);
  const [cleansingConfigs, setCleansingConfigs] = useState<CleansingConfig[]>([]);
  
  const [formData, setFormData] = useState({
    collectionId: '',
    chunkingStrategyId: '',
    cleansingConfigId: '',
    deleteOriginal: false,
  });

  useEffect(() => {
    if (open && document) {
      // Parse metadata to get previous settings
      let previousConfig: any = {};
      if (document.metadata) {
        try {
          const metadata = JSON.parse(document.metadata);
          previousConfig = metadata.processingConfig || {};
        } catch (error) {
          console.error('Failed to parse document metadata:', error);
        }
      }

      setFormData({
        collectionId: document.collectionId.toString(),
        chunkingStrategyId: '',
        cleansingConfigId: '',
        deleteOriginal: false,
      });
      fetchStrategiesAndConfigs(previousConfig);
    }
  }, [open, document]);

  const fetchStrategiesAndConfigs = async (previousConfig?: any) => {
    try {
      // Fetch chunking strategies
      const strategiesRes = await fetch('/api/rag/chunking-strategies');
      if (strategiesRes.ok) {
        const data = await strategiesRes.json();
        setChunkingStrategies(data.strategies || []);
        
        // Set previous or default strategy
        if (previousConfig?.chunkingStrategyId) {
          setFormData(prev => ({ ...prev, chunkingStrategyId: previousConfig.chunkingStrategyId.toString() }));
        } else {
          const defaultStrategy = data.strategies?.find((s: ChunkingStrategy) => s.isDefault);
          if (defaultStrategy) {
            setFormData(prev => ({ ...prev, chunkingStrategyId: defaultStrategy.id.toString() }));
          }
        }
      }

      // Fetch cleansing configs
      const configsRes = await fetch('/api/rag/cleansing-configs');
      if (configsRes.ok) {
        const data = await configsRes.json();
        setCleansingConfigs(data.configs || []);
        
        // Set previous or default config
        if (previousConfig?.cleansingConfigId) {
          setFormData(prev => ({ ...prev, cleansingConfigId: previousConfig.cleansingConfigId.toString() }));
        } else {
          const defaultConfig = data.configs?.find((c: CleansingConfig) => c.isDefault);
          if (defaultConfig) {
            setFormData(prev => ({ ...prev, cleansingConfigId: defaultConfig.id.toString() }));
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch strategies and configs:', error);
    }
  };

  const handleSubmit = async () => {
    if (!document) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/rag/documents/${document.id}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: parseInt(formData.collectionId),
          chunkingStrategyId: formData.chunkingStrategyId ? parseInt(formData.chunkingStrategyId) : undefined,
          cleansingConfigId: formData.cleansingConfigId ? parseInt(formData.cleansingConfigId) : undefined,
          deleteOriginal: formData.deleteOriginal,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to regenerate document');
      }

      toast.success(lang('documents.regenerateSuccess') || '문서 재생성이 시작되었습니다.');
      onRegenerateComplete();
      onOpenChange(false);
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
          <DialogTitle>{lang('documents.regenerate') || '문서 재생성'}</DialogTitle>
          <DialogDescription>
            {document?.title ? (
              <>"{document.title}" 문서를 다른 설정으로 재생성합니다.</>
            ) : (
              '선택한 문서를 다른 설정으로 재생성합니다.'
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="collection">{lang('documents.targetCollection') || '대상 컬렉션'}</Label>
            <Select
              value={formData.collectionId}
              onValueChange={(value) => setFormData({ ...formData, collectionId: value })}
            >
              <SelectTrigger id="collection">
                <SelectValue />
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
            <Label htmlFor="chunking">{lang('documents.chunkingStrategy') || 'Chunking 전략'}</Label>
            <Select
              value={formData.chunkingStrategyId}
              onValueChange={(value) => setFormData({ ...formData, chunkingStrategyId: value })}
            >
              <SelectTrigger id="chunking">
                <SelectValue placeholder={lang('documents.useDefault') || '기본값 사용'} />
              </SelectTrigger>
              <SelectContent>
                {chunkingStrategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id.toString()}>
                    {strategy.name} {strategy.isDefault && '(기본값)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cleansing">{lang('documents.cleansingConfig') || 'Cleansing 설정'}</Label>
            <Select
              value={formData.cleansingConfigId}
              onValueChange={(value) => setFormData({ ...formData, cleansingConfigId: value })}
            >
              <SelectTrigger id="cleansing">
                <SelectValue placeholder={lang('documents.useDefault') || '기본값 사용'} />
              </SelectTrigger>
              <SelectContent>
                {cleansingConfigs.map((config) => (
                  <SelectItem key={config.id} value={config.id.toString()}>
                    {config.name} {config.isDefault && '(기본값)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="deleteOriginal"
              checked={formData.deleteOriginal}
              onCheckedChange={(checked) => setFormData({ ...formData, deleteOriginal: checked as boolean })}
            />
            <Label
              htmlFor="deleteOriginal"
              className="text-sm font-normal cursor-pointer"
            >
              {lang('documents.deleteOriginal') || '원본 문서 삭제'}
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {lang('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !formData.collectionId}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {lang('documents.regenerate') || '재생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
