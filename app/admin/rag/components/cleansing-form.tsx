"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface CleansingFormProps {
  initialData?: {
    id?: number;
    name: string;
    llmModelId?: string | number;
    removeHeaders: boolean;
    removeFooters: boolean;
    removePageNumbers: boolean;
    normalizeWhitespace: boolean;
    fixEncoding: boolean;
  };
  isEdit?: boolean;
}

interface LLMModel {
  id: number | string;
  modelId: string;
  provider: string;
}

export function CleansingForm({ initialData, isEdit = false }: CleansingFormProps) {
  const router = useRouter();
  const { lang } = useTranslation('admin.rag');
  
  console.log('CleansingForm mounted with:', { initialData, isEdit });
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    llmModelId: initialData?.llmModelId || undefined as string | number | undefined,
    removeHeaders: initialData?.removeHeaders ?? true,
    removeFooters: initialData?.removeFooters ?? true,
    removePageNumbers: initialData?.removePageNumbers ?? true,
    normalizeWhitespace: initialData?.normalizeWhitespace ?? true,
    fixEncoding: initialData?.fixEncoding ?? true,
  });
  
  const [loading, setLoading] = useState(false);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLLMModels();
  }, []);

  const fetchLLMModels = async () => {
    try {
      const response = await fetch('/api/llm-models');
      if (!response.ok) throw new Error('Failed to fetch LLM models');
      const data = await response.json();
      setLlmModels(data || []);
    } catch (error) {
      console.error('Failed to fetch LLM models:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 디버깅을 위한 상세 로그
      console.log('handleSubmit called with:');
      console.log('- isEdit:', isEdit);
      console.log('- initialData:', initialData);
      console.log('- initialData?.id:', initialData?.id);
      console.log('- typeof initialData?.id:', typeof initialData?.id);
      
      const url = isEdit && initialData?.id
        ? `/api/rag/cleansing-configs/${initialData.id}`
        : '/api/rag/cleansing-configs';
      
      console.log('Final URL:', url, 'Method:', isEdit ? 'PUT' : 'POST');
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      // 더 상세한 에러 처리
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.error || `${response.status} ${response.statusText}`;
        
        if (response.status === 401) {
          toast.error(lang('errors.unauthorized'));
          router.push('/auth');
          return;
        } else if (response.status === 404) {
          toast.error(lang('errors.notFound'));
        } else if (response.status === 405) {
          toast.error(lang('errors.refreshAndRetry'));
        } else {
          toast.error(errorMessage || lang('errors.saveFailed'));
        }
        return;
      }

      toast.success(lang(isEdit ? 'success.updated' : 'success.created'));
      router.push('/admin/rag/settings');
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : lang('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? lang('cleansing.edit') : lang('cleansing.add')}
        </CardTitle>
        <CardDescription>
          {isEdit ? lang('cleansing.editDescription') : lang('cleansing.addDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{lang('cleansing.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={lang('cleansing.namePlaceholder')}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="llmModel">{lang('cleansing.llmModel')}</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="w-full justify-between"
                >
                  {formData.llmModelId
                    ? (() => {
                        const model = llmModels.find((m) => m.id.toString() === formData.llmModelId?.toString());
                        return model ? `${model.modelId} (${model.provider})` : lang('cleansing.selectLLMModel');
                      })()
                    : lang('cleansing.basicOnly')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={lang('cleansing.searchModel') || "Search model..."} />
                  <CommandEmpty>{lang('cleansing.noModelFound') || "No model found."}</CommandEmpty>
                  <CommandGroup className="max-h-[300px] overflow-y-auto">
                    <CommandItem
                      value="none"
                      onSelect={() => {
                        setFormData({ ...formData, llmModelId: undefined });
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          !formData.llmModelId ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {lang('cleansing.basicOnly')}
                    </CommandItem>
                    {llmModels.map((model) => (
                      <CommandItem
                        key={model.id}
                        value={`${model.modelId} ${model.provider}`}
                        onSelect={() => {
                          setFormData({ ...formData, llmModelId: model.id.toString() });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            formData.llmModelId?.toString() === model.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {model.modelId} ({model.provider})
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-medium">{lang('cleansing.rules')}</h4>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="removeHeaders" className="flex-1">{lang('cleansing.removeHeaders')}</Label>
              <Switch
                id="removeHeaders"
                checked={formData.removeHeaders}
                onCheckedChange={(checked) => setFormData({ ...formData, removeHeaders: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="removeFooters" className="flex-1">{lang('cleansing.removeFooters')}</Label>
              <Switch
                id="removeFooters"
                checked={formData.removeFooters}
                onCheckedChange={(checked) => setFormData({ ...formData, removeFooters: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="removePageNumbers" className="flex-1">{lang('cleansing.removePageNumbers')}</Label>
              <Switch
                id="removePageNumbers"
                checked={formData.removePageNumbers}
                onCheckedChange={(checked) => setFormData({ ...formData, removePageNumbers: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="normalizeWhitespace" className="flex-1">{lang('cleansing.normalizeWhitespace')}</Label>
              <Switch
                id="normalizeWhitespace"
                checked={formData.normalizeWhitespace}
                onCheckedChange={(checked) => setFormData({ ...formData, normalizeWhitespace: checked })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="fixEncoding" className="flex-1">{lang('cleansing.fixEncoding')}</Label>
              <Switch
                id="fixEncoding"
                checked={formData.fixEncoding}
                onCheckedChange={(checked) => setFormData({ ...formData, fixEncoding: checked })}
              />
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/rag/settings')}
              disabled={loading}
            >
              {lang('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? lang('saving') : lang('save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
