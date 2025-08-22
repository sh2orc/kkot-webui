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

interface VectorStore {
  id?: number;
  name: string;
  type: 'chromadb' | 'pgvector' | 'faiss';
  connectionString?: string;
  apiKey?: string;
  settings?: string;
  enabled: boolean;
  isDefault: boolean;
}

interface VectorStoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vectorStore?: VectorStore | null;
  onSave: () => void;
}

export function VectorStoreDialog({
  open,
  onOpenChange,
  vectorStore,
  onSave,
}: VectorStoreDialogProps) {
  const { lang } = useTranslation('admin.rag');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VectorStore>({
    name: '',
    type: 'chromadb',
    connectionString: '',
    apiKey: '',
    settings: '',
    enabled: true,
    isDefault: false,
  });

  useEffect(() => {
    if (vectorStore) {
      setFormData({
        ...vectorStore,
        settings: vectorStore.settings || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'chromadb',
        connectionString: '',
        apiKey: '',
        settings: '',
        enabled: true,
        isDefault: false,
      });
    }
  }, [vectorStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = vectorStore
        ? `/api/rag/vector-stores/${vectorStore.id}`
        : '/api/rag/vector-stores';
      
      const method = vectorStore ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save vector store');
      }

      toast.success(
        vectorStore
          ? lang('vectorStores.success.updated')
          : lang('vectorStores.success.created')
      );
      
      onSave();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : lang('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const getConnectionPlaceholder = () => {
    switch (formData.type) {
      case 'chromadb':
        return 'http://localhost:8000';
      case 'pgvector':
        return 'postgresql://user:password@localhost:5432/dbname';
      case 'faiss':
        return './faiss_data';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {vectorStore
                ? lang('vectorStores.edit')
                : lang('vectorStores.create')}
            </DialogTitle>
            <DialogDescription>
              {lang('vectorStores.dialogDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{lang('vectorStores.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang('vectorStores.namePlaceholder')}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">{lang('vectorStores.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                disabled={!!vectorStore}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromadb">ChromaDB</SelectItem>
                  <SelectItem value="pgvector">pgvector</SelectItem>
                  <SelectItem value="faiss">Faiss</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="connectionString">
                {lang('vectorStores.connectionString')}
              </Label>
              <Input
                id="connectionString"
                value={formData.connectionString}
                onChange={(e) => setFormData({ ...formData, connectionString: e.target.value })}
                placeholder={getConnectionPlaceholder()}
              />
            </div>

            {formData.type !== 'faiss' && (
              <div className="grid gap-2">
                <Label htmlFor="apiKey">{lang('vectorStores.apiKey')}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder={lang('vectorStores.apiKeyPlaceholder')}
                />
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="settings">
                {lang('vectorStores.advancedSettings')}
              </Label>
              <Textarea
                id="settings"
                value={formData.settings}
                onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                placeholder={lang('vectorStores.settingsPlaceholder')}
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enabled">{lang('vectorStores.enabled')}</Label>
              <Switch
                id="enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isDefault">{lang('vectorStores.setAsDefault')}</Label>
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
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
            <Button type="submit" disabled={loading}>
              {loading ? lang('saving') : lang('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
