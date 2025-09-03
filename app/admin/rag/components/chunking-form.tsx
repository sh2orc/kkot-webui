"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface ChunkingFormProps {
  initialData?: {
    id?: number;
    name: string;
    type: string;
    chunkSize: number;
    chunkOverlap: number;
  };
  isEdit?: boolean;
}

export function ChunkingForm({ initialData, isEdit = false }: ChunkingFormProps) {
  const router = useRouter();
  const { lang } = useTranslation('admin.rag');
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'fixed_size',
    chunkSize: initialData?.chunkSize?.toString() || '1000',
    chunkOverlap: initialData?.chunkOverlap?.toString() || '200',
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 디버깅을 위한 상세 로그
      console.log('handleSubmit called with:');
      console.log('- isEdit:', isEdit);
      console.log('- initialData:', initialData);
      console.log('- initialData?.id:', initialData?.id);
      
      const url = isEdit && initialData?.id
        ? `/api/rag/chunking-strategies/${initialData.id}`
        : '/api/rag/chunking-strategies';
      
      console.log('Final URL:', url, 'Method:', isEdit ? 'PUT' : 'POST');
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          chunkSize: parseInt(formData.chunkSize) || 1000,
          chunkOverlap: parseInt(formData.chunkOverlap) || 200,
        }),
      });

      // Handle 더 상세한 에러
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
          {isEdit ? lang('chunking.edit') : lang('chunking.add')}
        </CardTitle>
        <CardDescription>
          {isEdit ? lang('chunking.editDescription') : lang('chunking.addDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{lang('chunking.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={lang('chunking.namePlaceholder')}
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="type">{lang('chunking.type')}</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value })}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_size">Fixed Size</SelectItem>
                <SelectItem value="sentence">Sentence</SelectItem>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="sliding_window">Sliding Window</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="chunkSize">{lang('chunking.chunkSize')}</Label>
            <Input
              id="chunkSize"
              value={formData.chunkSize}
              onChange={(e) => setFormData({ ...formData, chunkSize: e.target.value })}
              placeholder="1000"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="chunkOverlap">{lang('chunking.overlap')}</Label>
            <Input
              id="chunkOverlap"
              value={formData.chunkOverlap}
              onChange={(e) => setFormData({ ...formData, chunkOverlap: e.target.value })}
              placeholder="200"
              required
            />
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
