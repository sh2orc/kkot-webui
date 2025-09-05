"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface Collection {
  id?: number;
  vectorStoreId: number;
  name: string;
  description?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  defaultChunkingStrategyId?: number;
  defaultCleansingConfigId?: number;
  defaultRerankingStrategyId?: number;
  isActive: boolean;
}

interface VectorStore {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
}

interface CollectionFormProps {
  collection?: Collection | null;
  vectorStores?: VectorStore[];
}

interface EmbeddingModel {
  id: string;
  modelId: string;
  provider: string;
  serverName?: string;
  capabilities?: any;
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

interface RerankingStrategy {
  id: number;
  name: string;
  type: string;
  isDefault: boolean;
}

export function CollectionForm({ collection, vectorStores: initialVectorStores }: CollectionFormProps) {
  const { lang } = useTranslation('admin.rag');
  const { lang: commonLang } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [vectorStores, setVectorStores] = useState<VectorStore[]>(initialVectorStores || []);
  const [embeddingModels, setEmbeddingModels] = useState<{ value: string; label: string; dimensions: number }[]>([]);
  const [chunkingStrategies, setChunkingStrategies] = useState<ChunkingStrategy[]>([]);
  const [cleansingConfigs, setCleansingConfigs] = useState<CleansingConfig[]>([]);
  const [rerankingStrategies, setRerankingStrategies] = useState<RerankingStrategy[]>([]);
  const [formData, setFormData] = useState<Collection>({
    vectorStoreId: 0,
    name: '',
    description: '',
    embeddingModel: 'text-embedding-ada-002',
    embeddingDimensions: 1536,
    defaultChunkingStrategyId: undefined,
    defaultCleansingConfigId: undefined,
    defaultRerankingStrategyId: undefined,
    isActive: true,
  });

  // Fetch vector stores if not provided
  const fetchVectorStores = async () => {
    if (initialVectorStores) return;
    
    try {
      const response = await fetch('/api/rag/vector-stores');
      if (!response.ok) throw new Error('Failed to fetch vector stores');
      const data = await response.json();
      setVectorStores(data.stores.filter((store: VectorStore) => store.enabled));
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    }
  };

  // Fetch embedding models list
  const fetchEmbeddingModels = async () => {
    try {
      setLoadingModels(true);
      const response = await fetch('/api/llm-models?publicOnly=true&embeddingOnly=true');
      if (!response.ok) {
        console.error('Failed to fetch embedding models');
        toast.error(lang('errors.fetchEmbeddingModelsFailed'));
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
            ? `${model.modelId} (${model.serverName})`
            : `${model.modelId} (${dimensions})`;
            
          return {
            value: model.modelId,
            label,
            dimensions
          };
        });
        
        setEmbeddingModels(modelOptions);
      } else {
        console.warn('No public embedding models found in database');
        toast.warning(lang('warnings.noEmbeddingModels'));
      }
    } catch (error) {
      console.error('Error fetching embedding models:', error);
      toast.error(lang('errors.fetchEmbeddingModelsFailed'));
    } finally {
      setLoadingModels(false);
    }
  };

  // Fetch chunking strategies
  const fetchChunkingStrategies = async () => {
    try {
      const response = await fetch('/api/rag/chunking-strategies');
      if (!response.ok) {
        console.warn('Failed to fetch chunking strategies');
        return;
      }
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
      if (!response.ok) {
        console.warn('Failed to fetch cleansing configs');
        return;
      }
      const data = await response.json();
      setCleansingConfigs(data.configs || []);
    } catch (error) {
      console.warn('Error fetching cleansing configs:', error);
    }
  };

  // Fetch reranking strategies
  const fetchRerankingStrategies = async () => {
    try {
      const response = await fetch('/api/rag/reranking-strategies');
      if (!response.ok) {
        console.warn('Failed to fetch reranking strategies');
        return;
      }
      const data = await response.json();
      setRerankingStrategies(data.strategies || []);
    } catch (error) {
      console.warn('Error fetching reranking strategies:', error);
    }
  };

  useEffect(() => {
    fetchVectorStores();
    fetchEmbeddingModels();
    fetchChunkingStrategies();
    fetchCleansingConfigs();
    fetchRerankingStrategies();
  }, []);

  useEffect(() => {
    if (collection) {
      setFormData(collection);
    } else if (vectorStores.length > 0 && embeddingModels.length > 0) {
      setFormData({
        vectorStoreId: vectorStores[0]?.id || 0,
        name: '',
        description: '',
        embeddingModel: embeddingModels[0]?.value || '',
        embeddingDimensions: embeddingModels[0]?.dimensions || 1536,
        defaultChunkingStrategyId: chunkingStrategies.find(s => s.isDefault)?.id,
        defaultCleansingConfigId: cleansingConfigs.find(c => c.isDefault)?.id,
        defaultRerankingStrategyId: rerankingStrategies.find(r => r.isDefault)?.id,
        isActive: true,
      });
    }
  }, [collection, vectorStores, embeddingModels, chunkingStrategies, cleansingConfigs, rerankingStrategies]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if embedding model is selected
    if (!formData.embeddingModel) {
      toast.error(lang('errors.selectEmbeddingModel'));
      return;
    }
    
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
        const errorData = await response.json();
        console.error('Collection save failed:', errorData);
        
        // Display specific error message from server
        let errorMessage = errorData.error || 'Failed to save collection';
        
        // Handle specific status codes
        if (response.status === 409) {
          // Conflict - collection already exists
          errorMessage = lang('errors.collectionAlreadyExists');
          toast.error(errorMessage);
        } else if (response.status === 400 && errorData.error?.includes('already exists in vector store')) {
          // Collection exists in vector store but might need sync
          toast.error(
            lang('errors.syncRequired') + 
            (errorData.troubleshooting ? ` (${errorData.troubleshooting})` : '')
          );
        } else {
          // Add troubleshooting info if available
          if (errorData.troubleshooting) {
            errorMessage += ` (${errorData.troubleshooting})`;
          }
          
          toast.error(errorMessage);
        }
        return;
      }

      const result = await response.json();
      
      // Show different success message if collection was synced
      if (result.message && result.message.includes('synced')) {
        toast.success(
          collection
            ? lang('collections.success.updated')
            : lang('collections.success.synced')
        );
      } else {
        toast.success(
          collection
            ? lang('collections.success.updated')
            : lang('collections.success.created')
        );
      }

      
      // Redirect to collections list
      router.push('/admin/rag/collections');
    } catch (error) {
      console.error('Collection save error:', error);
      const errorMessage = error instanceof Error ? error.message : lang('errors.saveFailed');
      toast.error(errorMessage);
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
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/rag/collections">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {commonLang('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {collection
              ? lang('collections.edit')
              : lang('collections.create')}
          </h1>
          <p className="text-muted-foreground">
            {lang('collections.dialogDescription')}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
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
              <p className="text-sm text-muted-foreground">
                {lang('collections.vectorStoreDescription')}
              </p>
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
              <p className="text-sm text-muted-foreground">
                {lang('collections.nameDescription')}
              </p>
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
              <p className="text-sm text-muted-foreground">
                {lang('collections.descriptionDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="embeddingModel">
                {lang('collections.embeddingModel')}
              </Label>
              {loadingModels ? (
                <div className="flex items-center justify-center h-10 border rounded-md">
                  <span className="text-sm text-muted-foreground">
                    {lang('loading')}
                  </span>
                </div>
              ) : embeddingModels.length === 0 ? (
                <div className="p-3 border rounded-md bg-yellow-50 dark:bg-yellow-900/10">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {lang('warnings.noEmbeddingModels')}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                    {lang('warnings.configureEmbeddingModels')}
                  </p>
                </div>
              ) : (
                <Select
                  value={formData.embeddingModel}
                  onValueChange={handleModelChange}
                  disabled={!!collection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={lang('collections.selectEmbeddingModel')} />
                  </SelectTrigger>
                  <SelectContent>
                    {embeddingModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        {model.label}
                      </SelectItem>
                    ))}
                                  </SelectContent>
              </Select>
              )}
              <p className="text-sm text-muted-foreground">
                {lang('collections.embeddingModelDescription')}
              </p>
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
              <p className="text-sm text-muted-foreground">
                {lang('collections.dimensionsDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chunkingStrategy">
                {lang('collections.chunkingStrategy')}
              </Label>
              <Select
                value={formData.defaultChunkingStrategyId?.toString() || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  defaultChunkingStrategyId: value === 'none' ? undefined : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang('collections.selectChunkingStrategy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{lang('collections.noChunkingStrategy')}</SelectItem>
                  {chunkingStrategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id.toString()}>
                      {strategy.name} ({strategy.type}, {strategy.chunkSize} chars)
                      {strategy.isDefault && ` (${lang('default')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {lang('collections.chunkingStrategyDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cleansingConfig">
                {lang('collections.cleansingConfig')}
              </Label>
              <Select
                value={formData.defaultCleansingConfigId?.toString() || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  defaultCleansingConfigId: value === 'none' ? undefined : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang('collections.selectCleansingConfig')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{lang('collections.noCleansingConfig')}</SelectItem>
                  {cleansingConfigs.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.name}
                      {config.llmModelName && ` (${config.llmModelName})`}
                      {config.isDefault && ` (${lang('default')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {lang('collections.cleansingConfigDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="rerankingStrategy">
                {lang('collections.rerankingStrategy')}
              </Label>
              <Select
                value={formData.defaultRerankingStrategyId?.toString() || 'none'}
                onValueChange={(value) => setFormData({ 
                  ...formData, 
                  defaultRerankingStrategyId: value === 'none' ? undefined : parseInt(value) 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={lang('collections.selectRerankingStrategy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{lang('collections.noRerankingStrategy')}</SelectItem>
                  {rerankingStrategies.map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id.toString()}>
                      {strategy.name} ({strategy.type})
                      {strategy.isDefault && ` (${lang('default')})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {lang('collections.rerankingStrategyDescription')}
              </p>
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

          <div className="flex justify-end gap-4 mt-6">
            <Link href="/admin/rag/collections">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
              >
                {commonLang('cancel')}
              </Button>
            </Link>
            <Button 
              type="submit" 
              disabled={loading || loadingModels || embeddingModels.length === 0 || !formData.embeddingModel}
            >
              {loading ? commonLang('saving') : commonLang('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
