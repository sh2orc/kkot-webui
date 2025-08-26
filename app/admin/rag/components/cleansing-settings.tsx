"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star, Bot } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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

interface LLMModel {
  id: number;
  name: string;
  modelName: string;
}

export function CleansingSettings() {
  const { lang } = useTranslation('admin.rag');
  const [configs, setConfigs] = useState<CleansingConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<CleansingConfig | null>(null);
  const [llmModels, setLlmModels] = useState<LLMModel[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    llmModelId: undefined as number | undefined,
    removeHeaders: true,
    removeFooters: true,
    removePageNumbers: true,
    normalizeWhitespace: true,
    fixEncoding: true,
  });

  useEffect(() => {
    fetchConfigs();
    fetchLLMModels();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/rag/cleansing-configs');
      if (!response.ok) throw new Error('Failed to fetch configs');
      const data = await response.json();
      setConfigs(data.configs);
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchLLMModels = async () => {
    try {
      const response = await fetch('/api/llm-models');
      if (!response.ok) throw new Error('Failed to fetch LLM models');
      const data = await response.json();
      setLlmModels(data.models || []);
    } catch (error) {
      console.error('Failed to fetch LLM models:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/rag/cleansing-configs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete config');

      toast.success(lang('success.deleted'));
      fetchConfigs();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };

  const handleAdd = () => {
    setEditingConfig(null);
    setFormData({
      name: '',
      llmModelId: undefined,
      removeHeaders: true,
      removeFooters: true,
      removePageNumbers: true,
      normalizeWhitespace: true,
      fixEncoding: true,
    });
    setDialogOpen(true);
  };

  const handleEdit = (config: CleansingConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      llmModelId: config.llmModelId,
      removeHeaders: config.removeHeaders,
      removeFooters: config.removeFooters,
      removePageNumbers: config.removePageNumbers,
      normalizeWhitespace: config.normalizeWhitespace,
      fixEncoding: config.fixEncoding,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingConfig 
        ? `/api/rag/cleansing-configs/${editingConfig.id}`
        : '/api/rag/cleansing-configs';
      
      const response = await fetch(url, {
        method: editingConfig ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save config');

      toast.success(lang(editingConfig ? 'success.updated' : 'success.created'));
      setDialogOpen(false);
      fetchConfigs();
    } catch (error) {
      toast.error(lang('errors.saveFailed'));
    }
  };



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
          <Button size="sm" disabled={loading} onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {lang('cleansing.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang('cleansing.name')}</TableHead>
              <TableHead>{lang('cleansing.llmModel')}</TableHead>
              <TableHead>{lang('cleansing.rules')}</TableHead>
              <TableHead className="text-right">{lang('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <>
                {[...Array(3)].map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-28" />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
            {!loading && configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {config.name}
                    {config.isDefault && (
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {config.llmModelName ? (
                    <Badge variant="outline">
                      <Bot className="h-3 w-3 mr-1" />
                      {config.llmModelName}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{lang('cleansing.basicOnly')}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {config.removeHeaders && <Badge variant="secondary">Headers</Badge>}
                    {config.removeFooters && <Badge variant="secondary">Footers</Badge>}
                    {config.removePageNumbers && <Badge variant="secondary">Page#</Badge>}
                    {config.normalizeWhitespace && <Badge variant="secondary">Whitespace</Badge>}
                    {config.fixEncoding && <Badge variant="secondary">Encoding</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(config)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && configs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {lang('cleansing.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingConfig ? lang('cleansing.edit') : lang('cleansing.add')}
            </DialogTitle>
            <DialogDescription>
              {editingConfig ? lang('cleansing.editDescription') : lang('cleansing.addDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{lang('cleansing.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang('cleansing.namePlaceholder')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="llmModel">{lang('cleansing.llmModel')}</Label>
              <Select
                value={formData.llmModelId?.toString() || ''}
                onValueChange={(value) => setFormData({ ...formData, llmModelId: value ? parseInt(value) : undefined })}
              >
                <SelectTrigger id="llmModel">
                  <SelectValue placeholder={lang('cleansing.selectLLMModel')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{lang('cleansing.basicOnly')}</SelectItem>
                  {llmModels.map((model) => (
                    <SelectItem key={model.id} value={model.id.toString()}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {lang('cancel')}
            </Button>
            <Button onClick={handleSave}>
              {lang('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
