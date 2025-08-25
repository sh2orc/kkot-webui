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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
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
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<'success' | 'failed' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [troubleshooting, setTroubleshooting] = useState<string | null>(null);
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
    setError(null); // Clear error when dialog opens/changes
    setTroubleshooting(null);
    setConnectionTestResult(null);
  }, [vectorStore, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
        const errorData = await response.json();
        const errorMessage = errorData.error || 'Failed to save vector store';
        setError(errorMessage);
        setTroubleshooting(errorData.troubleshooting || null);
        toast.error(errorMessage);
        return;
      }

      toast.success(
        vectorStore
          ? lang('vectorStores.success.updated')
          : lang('vectorStores.success.created')
      );
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : lang('errors.saveFailed');
      setError(errorMessage);
      setTroubleshooting(null);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.connectionString && formData.type !== 'faiss') {
      setError('연결 문자열을 입력해주세요.');
      return;
    }

    setTestingConnection(true);
    setError(null);
    setTroubleshooting(null);
    setConnectionTestResult(null);

    try {
      const response = await fetch('/api/rag/vector-stores/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: formData.type,
          connectionString: formData.connectionString,
          apiKey: formData.apiKey,
          settings: formData.settings,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '연결 테스트에 실패했습니다.');
        setTroubleshooting(result.troubleshooting || null);
        setConnectionTestResult('failed');
        toast.error(result.error || '연결 테스트에 실패했습니다.');
        return;
      }

      toast.success('연결 테스트가 성공했습니다!');
      setError(null);
      setTroubleshooting(null);
      setConnectionTestResult('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '연결 테스트에 실패했습니다.';
      setError(errorMessage);
      setTroubleshooting(null);
      setConnectionTestResult('failed');
      toast.error(errorMessage);
    } finally {
      setTestingConnection(false);
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

  const getTypeDescription = () => {
    switch (formData.type) {
      case 'chromadb':
        return 'ChromaDB는 오픈소스 벡터 데이터베이스입니다. HTTP/HTTPS URL을 입력하세요.';
      case 'pgvector':
        return 'PostgreSQL의 pgvector 확장을 사용합니다. PostgreSQL 연결 문자열을 입력하세요.';
      case 'faiss':
        return 'Facebook AI Similarity Search (Faiss)를 사용합니다. 로컬 파일 경로를 입력하세요.';
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
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>{error}</div>
                    {troubleshooting && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          문제 해결 방법 보기
                        </summary>
                        <pre className="mt-2 text-xs whitespace-pre-wrap bg-muted p-2 rounded">
                          {troubleshooting}
                        </pre>
                      </details>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

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
                onValueChange={(value: any) => {
                  setFormData({ ...formData, type: value });
                  setConnectionTestResult(null); // Reset test result when type changes
                }}
                disabled={!!vectorStore}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chromadb">ChromaDB</SelectItem>
                  <SelectItem value="pgvector">pgvector (PostgreSQL)</SelectItem>
                  <SelectItem value="faiss">Faiss (로컬)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {getTypeDescription()}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="connectionString">
                {lang('vectorStores.connectionString')}
              </Label>
              <Input
                id="connectionString"
                value={formData.connectionString}
                onChange={(e) => {
                  setFormData({ ...formData, connectionString: e.target.value });
                  setConnectionTestResult(null); // Reset test result when connection string changes
                }}
                placeholder={getConnectionPlaceholder()}
              />
              <p className="text-sm text-muted-foreground">
                {formData.type === 'chromadb' && 'Example: http://localhost:8000 or https://your-chroma-server.com'}
                {formData.type === 'pgvector' && '예: postgresql://username:password@localhost:5432/database'}
                {formData.type === 'faiss' && '예: ./data/faiss_index 또는 /path/to/faiss/data'}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestConnection}
                  disabled={testingConnection || (!formData.connectionString && formData.type !== 'faiss')}
                  className="w-fit"
                >
                  {testingConnection ? '연결 테스트 중...' : '연결 테스트'}
                </Button>
                {connectionTestResult === 'success' && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>연결 성공</span>
                  </div>
                )}
                {connectionTestResult === 'failed' && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <XCircle className="h-4 w-4" />
                    <span>연결 실패</span>
                  </div>
                )}
              </div>
            </div>

            {formData.type !== 'faiss' && (
              <div className="grid gap-2">
                <Label htmlFor="apiKey">{lang('vectorStores.apiKey')}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => {
                    setFormData({ ...formData, apiKey: e.target.value });
                    setConnectionTestResult(null); // Reset test result when API key changes
                  }}
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
