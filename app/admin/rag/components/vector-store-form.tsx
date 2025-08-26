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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

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

interface VectorStoreFormProps {
  vectorStore?: VectorStore | null;
}

export function VectorStoreForm({ vectorStore }: VectorStoreFormProps) {
  const { lang } = useTranslation('admin.rag');
  const { lang: commonLang } = useTranslation('common');
  const router = useRouter();
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
    setError(null);
    setTroubleshooting(null);
    setConnectionTestResult(null);
  }, [vectorStore]);

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
      
      // Redirect to vector stores list
      router.push('/admin/rag/vector-stores');
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
      setError(lang('vectorStores.errors.connectionStringRequired'));
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
        setError(result.error || lang('vectorStores.errors.connectionTestFailed'));
        setTroubleshooting(result.troubleshooting || null);
        setConnectionTestResult('failed');
        toast.error(result.error || lang('vectorStores.errors.connectionTestFailed'));
        return;
      }

      toast.success(lang('vectorStores.success.testConnection'));
      setError(null);
      setTroubleshooting(null);
      setConnectionTestResult('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : lang('vectorStores.errors.connectionTestFailed');
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
        return lang('vectorStores.types.chromadb.description');
      case 'pgvector':
        return lang('vectorStores.types.pgvector.description');
      case 'faiss':
        return lang('vectorStores.types.faiss.description');
      default:
        return '';
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/rag/vector-stores">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {commonLang('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {vectorStore
              ? lang('vectorStores.edit')
              : lang('vectorStores.create')}
          </h1>
          <p className="text-muted-foreground">
            {lang('vectorStores.dialogDescription')}
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>{error}</div>
                    {troubleshooting && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium">
                          {lang('vectorStores.troubleshootingTitle')}
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
                  <SelectItem value="chromadb">{lang('vectorStores.types.chromadb.name')}</SelectItem>
                  <SelectItem value="pgvector">{lang('vectorStores.types.pgvector.name')}</SelectItem>
                  <SelectItem value="faiss">{lang('vectorStores.types.faiss.name')}</SelectItem>
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
                {formData.type === 'chromadb' && lang('vectorStores.types.chromadb.example')}
                {formData.type === 'pgvector' && lang('vectorStores.types.pgvector.example')}
                {formData.type === 'faiss' && lang('vectorStores.types.faiss.example')}
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
                  {testingConnection ? lang('vectorStores.connectionTesting') : lang('vectorStores.connectionTest')}
                </Button>
                {connectionTestResult === 'success' && (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    <span>{lang('vectorStores.connectionSuccess')}</span>
                  </div>
                )}
                {connectionTestResult === 'failed' && (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <XCircle className="h-4 w-4" />
                    <span>{lang('vectorStores.connectionFailed')}</span>
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

          <div className="flex justify-end gap-4 mt-6">
            <Link href="/admin/rag/vector-stores">
              <Button
                type="button"
                variant="outline"
                disabled={loading}
              >
                {commonLang('cancel')}
              </Button>
            </Link>
            <Button type="submit" disabled={loading}>
              {loading ? commonLang('saving') : commonLang('save')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
