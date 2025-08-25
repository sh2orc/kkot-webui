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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Collection {
  id?: number;
  vectorStoreId: number;
  name: string;
  description?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  isActive: boolean;
}

interface VectorStore {
  id: number;
  name: string;
  type: string;
}

interface CollectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collection?: Collection | null;
  vectorStores: VectorStore[];
  onSave: () => void;
}

interface EmbeddingModel {
  id: string;
  modelId: string;
  provider: string;
  serverName?: string;
  capabilities?: any;
}

// Default embedding models (fallback)
const DEFAULT_EMBEDDING_MODELS = [
  { value: 'text-embedding-ada-002', label: 'text-embedding-ada-002', dimensions: 1536 },
  { value: 'text-embedding-3-small', label: 'text-embedding-3-small', dimensions: 1536 },
  { value: 'text-embedding-3-large', label: 'text-embedding-3-large', dimensions: 3072 },
];

export function CollectionDialog({
  open,
  onOpenChange,
  collection,
  vectorStores,
  onSave,
}: CollectionDialogProps) {
  const { lang } = useTranslation('admin.rag');
  const [loading, setLoading] = useState(false);
  const [embeddingModels, setEmbeddingModels] = useState(DEFAULT_EMBEDDING_MODELS);
  const [formData, setFormData] = useState<Collection>({
    vectorStoreId: 0,
    name: '',
    description: '',
    embeddingModel: 'text-embedding-ada-002',
    embeddingDimensions: 1536,
    isActive: true,
  });

  // Fetch embedding models list
  const fetchEmbeddingModels = async () => {
    try {
      const response = await fetch('/api/llm-models?publicOnly=true&embeddingOnly=true');
      if (!response.ok) {
        console.warn('Failed to fetch embedding models, using defaults');
        return;
      }
      
      const models: EmbeddingModel[] = await response.json();
      
      if (models.length > 0) {
        const modelOptions = models.map(model => {
          // Estimate default dimensions (based on model name)
          let dimensions = 1536; // Default value
          if (model.modelId.includes('3-large')) dimensions = 3072;
          else if (model.modelId.includes('3-small')) dimensions = 1536;
          else if (model.modelId.includes('ada-002')) dimensions = 1536;
          
          const label = model.serverName 
            ? `${model.modelId} (${model.serverName}) (${dimensions})`
            : `${model.modelId} (${dimensions})`;
            
          return {
            value: model.modelId,
            label,
            dimensions
          };
        });
        
        setEmbeddingModels(modelOptions);
      }
    } catch (error) {
      console.warn('Error fetching embedding models:', error);
      // Use default models on error
    }
  };

  useEffect(() => {
    fetchEmbeddingModels();
  }, []);

  useEffect(() => {
    if (collection) {
      setFormData(collection);
    } else {
      setFormData({
        vectorStoreId: vectorStores[0]?.id || 0,
        name: '',
        description: '',
        embeddingModel: embeddingModels[0]?.value || 'text-embedding-ada-002',
        embeddingDimensions: embeddingModels[0]?.dimensions || 1536,
        isActive: true,
      });
    }
  }, [collection, vectorStores, embeddingModels]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = collection
        ? `/api/rag/collections/${collection.id}`
        : '/api/rag/collections';
      
      const method = collection ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save collection');
      }

      toast.success(
        collection
          ? lang('collections.success.updated')
          : lang('collections.success.created')
      );
      
      onSave();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : lang('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (model: string) => {
    const selectedModel = embeddingModels.find(m => m.value === model);
    if (selectedModel) {
      setFormData({
        ...formData,
        embeddingModel: model,
        embeddingDimensions: selectedModel.dimensions,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {collection
                ? lang('collections.edit')
                : lang('collections.create')}
            </DialogTitle>
            <DialogDescription>
              {lang('collections.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="vectorStore">{lang('collections.vectorStore')}</Label>
              <Select
                value={formData.vectorStoreId.toString()}
                onValueChange={(value) => setFormData({ ...formData, vectorStoreId: parseInt(value) })}
                disabled={!!collection}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {vectorStores.map((store) => (
                    <SelectItem key={store.id} value={store.id.toString()}>
                      {store.name} ({store.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">{lang('collections.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang('collections.namePlaceholder')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">{lang('collections.description')}</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={lang('collections.descriptionPlaceholder')}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="embeddingModel">
                {lang('collections.embeddingModel')}
              </Label>
              <Select
                value={formData.embeddingModel}
                onValueChange={handleModelChange}
                disabled={!!collection}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {embeddingModels.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dimensions">
                {lang('collections.dimensions')}
              </Label>
              <Input
                id="dimensions"
                type="number"
                value={formData.embeddingDimensions}
                onChange={(e) => setFormData({ ...formData, embeddingDimensions: parseInt(e.target.value) })}
                disabled={!!collection}
                required
              />
            </div>

            {collection && (
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">{lang('collections.active')}</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
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
            <Button type="submit" disabled={loading}>
              {loading ? lang('saving') : lang('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
