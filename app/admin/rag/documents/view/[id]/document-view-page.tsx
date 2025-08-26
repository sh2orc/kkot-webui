"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { useTranslation as useCommonTranslation } from "@/lib/i18n";
import AdminLayout from "@/components/admin/admin-layout";
import { RAGNavigation } from "../../../components/rag-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, FileText, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface Document {
  id: number;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  contentType: string;
  processingStatus: string;
  errorMessage?: string;
  createdAt: number;
  collectionName?: string;
  metadata?: any;
  rawContent?: string;
}

interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  cleanedContent?: string;
  tokenCount?: number;
  metadata?: any;
}

interface DocumentViewPageProps {
  documentId: string;
}

export default function DocumentViewPage({ documentId }: DocumentViewPageProps) {
  const router = useRouter();
  const { lang } = useTranslation('admin.rag');
  const { lang: commonLang } = useCommonTranslation('common');
  const [loading, setLoading] = useState(true);
  const [document, setDocument] = useState<Document | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);

  useEffect(() => {
    if (documentId) {
      fetchDocumentDetails();
    }
  }, [documentId]);

  const fetchDocumentDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rag/documents/${documentId}?includeChunks=true`);
      if (!response.ok) throw new Error('Failed to fetch document details');
      const data = await response.json();
      setDocument(data.document);
      setChunks(data.chunks || []);
    } catch (error) {
      console.error('Failed to fetch document details:', error);
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default">{lang('documents.status.completed')}</Badge>;
      case 'processing':
        return <Badge variant="secondary">{lang('documents.status.processing')}</Badge>;
      case 'pending':
        return <Badge variant="outline">{lang('documents.status.pending')}</Badge>;
      case 'failed':
        return <Badge variant="destructive">{lang('documents.status.failed')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">{lang('loading')}</p>
        </div>
      );
    }

    if (!document) {
      return (
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">{lang('documents.notFound')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/rag/documents')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {commonLang('back')}
          </Button>
        </div>

        {/* Document Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{document.title}</CardTitle>
            </div>
            <CardDescription>{document.filename}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{lang('documents.collection')}:</span>
                  <Badge variant="outline">{document.collectionName}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{lang('documents.type')}:</span>
                  <span className="text-sm">{document.contentType.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{lang('documents.size')}:</span>
                  <span className="text-sm">{formatFileSize(document.fileSize)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{lang('documents.status')}:</span>
                  {getStatusBadge(document.processingStatus)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{lang('documents.uploadedAt')}:</span>
                  <span className="text-sm">{new Date(document.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {document.errorMessage && (
              <div className="mt-4 p-3 bg-destructive/10 rounded-md">
                <p className="text-sm font-medium text-destructive">Error:</p>
                <p className="text-sm text-destructive">{document.errorMessage}</p>
              </div>
            )}

            {/* Chunking Information Subgroup */}
            <Separator className="my-4" />
            
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">{lang('documents.chunkingInfo')}</h4>
            </div>
            
            {document.metadata && (() => {
              try {
                const metadata = typeof document.metadata === 'string' 
                  ? JSON.parse(document.metadata) 
                  : document.metadata;
                const processingConfig = metadata.processingConfig || {};
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{lang('documents.chunkingStrategy')}:</span>
                        <span className="text-sm">{processingConfig.chunkingStrategy || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{lang('documents.chunkSize')}:</span>
                        <span className="text-sm">{processingConfig.chunkSize || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{lang('documents.chunkOverlap')}:</span>
                        <span className="text-sm">{processingConfig.chunkOverlap || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{lang('documents.cleansingConfigUsed')}:</span>
                        <span className="text-sm">{processingConfig.cleansingConfigId ? `Config #${processingConfig.cleansingConfigId}` : 'None'}</span>
                      </div>
                    </div>
                  </div>
                );
              } catch (error) {
                return (
                  <p className="text-sm text-muted-foreground">{lang('documents.chunkingInfoLoadError')}</p>
                );
              }
            })()}
            
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{lang('documents.totalChunks')}:</span>
                <span className="text-sm font-medium">{chunks.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Card>
          <CardContent className="pt-6">
            <Tabs defaultValue="chunks" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="chunks">
                  {lang('documents.chunks')} ({chunks.length})
                </TabsTrigger>
                <TabsTrigger value="original">
                  {lang('documents.rawContent')}
                </TabsTrigger>
                <TabsTrigger value="metadata">
                  {lang('documents.metadata')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="chunks" className="mt-4">
                <ScrollArea className="h-[600px] rounded-md border p-4">
                  {chunks.length === 0 ? (
                    <p className="text-center text-muted-foreground">{lang('documents.noChunks')}</p>
                  ) : (
                    <div className="space-y-4">
                      {chunks.map((chunk) => (
                        <Card key={chunk.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {lang('documents.chunk')} #{chunk.chunkIndex + 1}
                                </Badge>
                                {chunk.metadata?.startIndex !== undefined && chunk.metadata?.endIndex !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {lang('documents.chunkPosition')}: {chunk.metadata.startIndex} - {chunk.metadata.endIndex}
                                  </span>
                                )}
                              </div>
                              {chunk.tokenCount && (
                                <span className="text-sm text-muted-foreground">
                                  {chunk.tokenCount} tokens
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="bg-muted p-4 rounded-md">
                              <pre className="text-sm whitespace-pre-wrap">
                                {chunk.cleanedContent || chunk.content}
                              </pre>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="original" className="mt-4">
                <ScrollArea className="h-[600px] rounded-md border p-4">
                  {document.rawContent ? (
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">
                        {document.rawContent}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      {lang('documents.noRawContent')}
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata" className="mt-4">
                <ScrollArea className="h-[600px] rounded-md border p-4">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(document.metadata || {}, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('documents.title')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('documents.description')}
          </p>
        </div>
        
        {renderContent()}
      </div>
    </AdminLayout>
  );
}
