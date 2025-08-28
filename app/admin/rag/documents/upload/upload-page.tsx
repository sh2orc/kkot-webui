"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, File, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Collection {
  id: number;
  name: string;
  defaultChunkingStrategyId?: number;
  defaultCleansingConfigId?: number;
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

export default function UploadPage() {
  const { lang } = useTranslation('admin.rag');
  const { lang: commonLang } = useTranslation('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [chunkingStrategies, setChunkingStrategies] = useState<ChunkingStrategy[]>([]);
  const [cleansingConfigs, setCleansingConfigs] = useState<CleansingConfig[]>([]);
  const [selectedChunkingStrategy, setSelectedChunkingStrategy] = useState<string>('use-default');
  const [selectedCleansingConfig, setSelectedCleansingConfig] = useState<string>('use-default');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch collections
  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/rag/collections');
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      const activeCollections = data.collections.filter((c: Collection) => c.id);
      setCollections(activeCollections);
      
      // Set first collection as default
      if (activeCollections.length > 0 && !selectedCollection) {
        setSelectedCollection(activeCollections[0].id.toString());
      }
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    }
  };

  // Fetch chunking strategies
  const fetchChunkingStrategies = async () => {
    try {
      const response = await fetch('/api/rag/chunking-strategies');
      if (!response.ok) return;
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
      if (!response.ok) return;
      const data = await response.json();
      setCleansingConfigs(data.configs || []);
    } catch (error) {
      console.warn('Error fetching cleansing configs:', error);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchChunkingStrategies();
    fetchCleansingConfigs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error(lang('documents.noFilesSelected'));
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('collectionId', selectedCollection);
      
      // Add override options if selected (and not using default)
      if (selectedChunkingStrategy && selectedChunkingStrategy !== 'use-default') {
        formData.append('chunkingStrategyId', selectedChunkingStrategy);
      }
      if (selectedCleansingConfig && selectedCleansingConfig !== 'use-default') {
        formData.append('cleansingConfigId', selectedCleansingConfig);
      }
      
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/rag/documents', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload documents');
      }

      const result = await response.json();
      const successCount = result.results.filter((r: any) => r.status !== 'failed').length;
      
      // Replace {{count}} with actual count value
      const successMessage = lang('documents.uploadSuccess').replace('{{count}}', successCount.toString());
      toast.success(successMessage);
      
      // Navigate back to documents page
      router.push('/admin/rag/documents');
    } catch (error) {
      toast.error(lang('documents.uploadFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/rag/documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {commonLang('back')}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{lang('documents.uploadTitle')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('documents.uploadDescription')}
          </p>
        </div>
      </div>

        <Card>
          <CardHeader>
            <CardTitle>{lang('documents.uploadSettings')}</CardTitle>
            <CardDescription>
              {lang('documents.uploadSettingsDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="collection">{lang('documents.collection')}</Label>
                  <Select
                    value={selectedCollection}
                    onValueChange={setSelectedCollection}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lang('documents.selectCollection')} />
                    </SelectTrigger>
                    <SelectContent>
                      {collections.map((collection) => (
                        <SelectItem key={collection.id} value={collection.id.toString()}>
                          {collection.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {lang('documents.collectionDescription')}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="files">{lang('documents.files')}</Label>
                  <Input
                    id="files"
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.html,.md,.csv,.json"
                    onChange={(e) => setSelectedFiles(e.target.files)}
                    required
                  />
                  <p className="text-sm text-muted-foreground">
                    {lang('documents.supportedFormats')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lang('documents.filesDescription')}
                  </p>
                </div>

                {selectedFiles && selectedFiles.length > 0 && (
                  <div className="grid gap-2">
                    <Label>{lang('documents.selectedFiles')}</Label>
                    <div className="space-y-1">
                      {Array.from(selectedFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <File className="h-4 w-4" />
                          <span>{file.name}</span>
                          <span className="text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid gap-2">
                  <Label htmlFor="chunkingStrategy">
                    {lang('documents.chunkingStrategyOverride')}
                  </Label>
                  <Select
                    value={selectedChunkingStrategy}
                    onValueChange={setSelectedChunkingStrategy}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lang('documents.useCollectionDefault')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="use-default">{lang('documents.useCollectionDefault')}</SelectItem>
                      {chunkingStrategies.map((strategy) => (
                        <SelectItem key={strategy.id} value={strategy.id.toString()}>
                          {strategy.name} ({strategy.type}, {strategy.chunkSize} chars)
                          {strategy.isDefault && ` (${lang('default')})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {lang('documents.chunkingStrategyDescription')}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="cleansingConfig">
                    {lang('documents.cleansingConfigOverride')}
                  </Label>
                  <Select
                    value={selectedCleansingConfig}
                    onValueChange={setSelectedCleansingConfig}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lang('documents.useCollectionDefault')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="use-default">{lang('documents.useCollectionDefault')}</SelectItem>
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
                    {lang('documents.cleansingConfigDescription')}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <Link href="/admin/rag/documents">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                  >
                    {commonLang('cancel')}
                  </Button>
                </Link>
                <Button type="submit" disabled={loading || !selectedFiles}>
                  {loading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-pulse" />
                      {lang('uploading')}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {lang('upload')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
