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
import { Card, CardContent } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RerankingStrategy {
  id?: number;
  name: string;
  type: string;
  rerankingModelId?: number | null;
  topK: number;
  minScore?: number | string | null;
  settings?: string;
  isDefault: boolean;
}

interface LLMModel {
  id: number;
  modelId: string;
  name: string;
  provider: string;
  serverName?: string;
  capabilities?: string[];
}

interface RerankingFormProps {
  strategy?: RerankingStrategy | null;
}

export function RerankingForm({ strategy }: RerankingFormProps) {
  const { lang } = useTranslation('admin.rag');
  const { lang: commonLang } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingModels, setLoadingModels] = useState(true);
  const [rerankingModels, setRerankingModels] = useState<LLMModel[]>([]);
  const [modelComboboxOpen, setModelComboboxOpen] = useState(false);
  const [modelSearchValue, setModelSearchValue] = useState("");
  const [formData, setFormData] = useState<RerankingStrategy>({
    name: '',
    type: 'none',
    rerankingModelId: null,
    topK: 10,
    minScore: null,
    settings: '',
    isDefault: false,
  });

  // Fetch reranking models
  const fetchRerankingModels = async () => {
    try {
      setLoadingModels(true);
      const response = await fetch('/api/rag/reranking-strategies');
      if (!response.ok) {
        console.error('Failed to fetch reranking strategies data');
        return;
      }
      
      const data = await response.json();
      setRerankingModels(data.rerankingModels || []);
    } catch (error) {
      console.error('Error fetching reranking models:', error);
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    fetchRerankingModels();
  }, []);

  useEffect(() => {
    if (strategy) {
      setFormData({
        ...strategy,
        settings: strategy.settings || '',
      });
    }
  }, [strategy]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate model requirement for model_based type
    if (formData.type === 'model_based' && !formData.rerankingModelId) {
      toast.error(lang('reranking.errors.modelRequired'));
      return;
    }
    
    setLoading(true);

    try {
      // Parse settings if it's a valid JSON string
      let parsedSettings = null;
      if (formData.settings) {
        try {
          parsedSettings = JSON.parse(formData.settings);
        } catch (e) {
          // If not valid JSON, keep as null
          console.warn('Invalid JSON in settings field');
        }
      }

      const payload = {
        ...formData,
        rerankingModelId: (formData.type === 'model_based' || formData.type === 'hybrid') ? formData.rerankingModelId : null,
        minScore: formData.minScore ? parseFloat(formData.minScore as string) : null,
        settings: parsedSettings,
      };

      const url = strategy
        ? `/api/rag/reranking-strategies/${strategy.id}`
        : '/api/rag/reranking-strategies';
      
      const method = strategy ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save strategy');
      }

      toast.success(
        strategy
          ? lang('success.updated')
          : lang('success.created')
      );
      
      // Redirect to settings page
      router.push('/admin/rag/settings');
    } catch (error) {
      console.error('Strategy save error:', error);
      const errorMessage = error instanceof Error ? error.message : lang('errors.saveFailed');
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: string) => {
    setFormData({
      ...formData,
      type,
      // Reset model if not model_based or hybrid
      rerankingModelId: (type === 'model_based' || type === 'hybrid') ? formData.rerankingModelId : null,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/rag/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {commonLang('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {strategy
              ? lang('reranking.edit')
              : lang('reranking.add')}
          </h1>
          <p className="text-muted-foreground">
            {strategy
              ? lang('reranking.editDescription')
              : lang('reranking.addDescription')}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">{lang('reranking.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang('reranking.namePlaceholder')}
                required
              />
              <p className="text-sm text-muted-foreground">
                {lang('reranking.nameDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">{lang('reranking.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{lang('reranking.types.none')}</SelectItem>
                  <SelectItem value="model_based">{lang('reranking.types.model_based')}</SelectItem>
                  <SelectItem value="rule_based">{lang('reranking.types.rule_based')}</SelectItem>
                  <SelectItem value="hybrid">{lang('reranking.types.hybrid')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {lang(`reranking.typeDescriptions.${formData.type}`)}
              </p>
            </div>

            {(formData.type === 'model_based' || formData.type === 'hybrid') && (
              <div className="grid gap-2">
                <Label htmlFor="rerankingModel">
                  {lang('reranking.model')} *
                </Label>
                {loadingModels ? (
                  <div className="flex items-center justify-center h-10 border rounded-md">
                    <span className="text-sm text-muted-foreground">
                      {lang('loading')}
                    </span>
                  </div>
                ) : rerankingModels.length === 0 ? (
                  <div className="p-3 border rounded-md bg-yellow-50 dark:bg-yellow-900/10">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {lang('warnings.noEmbeddingModels')}
                    </p>
                  </div>
                ) : (
                  <Popover open={modelComboboxOpen} onOpenChange={setModelComboboxOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={modelComboboxOpen}
                        className="w-full justify-between"
                      >
                        {formData.rerankingModelId
                          ? rerankingModels.find((model) => model.id === formData.rerankingModelId)?.modelId || 
                            rerankingModels.find((model) => model.id === formData.rerankingModelId)?.name
                          : lang('reranking.selectModel')}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popper-anchor-width)] min-w-[var(--radix-popper-anchor-width)] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder={lang('reranking.searchModelPlaceholder') || "Search model..."} 
                          value={modelSearchValue}
                          onValueChange={setModelSearchValue}
                        />
                        <CommandEmpty>{lang('reranking.noModelFound') || "No model found."}</CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                          {rerankingModels
                            .filter((model) => {
                              const searchLower = modelSearchValue.toLowerCase();
                              return (
                                model.modelId.toLowerCase().includes(searchLower) ||
                                model.name?.toLowerCase().includes(searchLower) ||
                                model.serverName?.toLowerCase().includes(searchLower)
                              );
                            })
                            .map((model) => (
                              <CommandItem
                                key={model.id}
                                value={model.id.toString()}
                                onSelect={() => {
                                  setFormData({ 
                                    ...formData, 
                                    rerankingModelId: model.id
                                  });
                                  setModelComboboxOpen(false);
                                  setModelSearchValue("");
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.rerankingModelId === model.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div>{model.name || model.modelId}</div>
                                  {model.serverName && (
                                    <div className="text-sm text-muted-foreground">{model.serverName}</div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
                <p className="text-sm text-muted-foreground">
                  {lang('reranking.modelDescription')}
                </p>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="topK">{lang('reranking.topK')}</Label>
              <Input
                id="topK"
                type="number"
                min="1"
                max="100"
                value={formData.topK}
                onChange={(e) => setFormData({ ...formData, topK: parseInt(e.target.value) || 10 })}
                required
              />
              <p className="text-sm text-muted-foreground">
                {lang('reranking.topKDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="minScore">{lang('reranking.minScore')}</Label>
              <Input
                id="minScore"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={formData.minScore || ''}
                onChange={(e) => setFormData({ ...formData, minScore: e.target.value || null })}
                placeholder="0.0 - 1.0"
              />
              <p className="text-sm text-muted-foreground">
                {lang('reranking.minScoreDescription')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="settings">{lang('reranking.settings')}</Label>
              <Textarea
                id="settings"
                value={formData.settings}
                onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                placeholder={lang('reranking.settingsPlaceholder')}
                rows={4}
              />
              <p className="text-sm text-muted-foreground">
                {lang('reranking.settingsDescription')}
              </p>
            </div>

            {!strategy && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="isDefault">{lang('default')}</Label>
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {lang('reranking.isDefaultDescription')}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-6">
            <Link href="/admin/rag/settings">
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
              disabled={loading || ((formData.type === 'model_based' || formData.type === 'hybrid') && !formData.rerankingModelId)}
            >
              {loading ? commonLang('saving') : commonLang('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
