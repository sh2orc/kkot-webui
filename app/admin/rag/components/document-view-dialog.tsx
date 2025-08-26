"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { FileText, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  metadata?: string;
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

interface DocumentViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document;
}

export function DocumentViewDialog({
  open,
  onOpenChange,
  document,
}: DocumentViewDialogProps) {
  const { lang } = useTranslation('admin.rag');
  const [loading, setLoading] = useState(false);
  const [documentData, setDocumentData] = useState<any>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);

  useEffect(() => {
    if (open && document) {
      fetchDocumentDetails();
    }
  }, [open, document]);

  const fetchDocumentDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/rag/documents/${document.id}?includeChunks=true`);
      if (!response.ok) throw new Error('Failed to fetch document details');
      const data = await response.json();
      setDocumentData(data.document);
      setChunks(data.chunks || []);
    } catch (error) {
      console.error('Failed to fetch document details:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{document.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{lang('documents.filename')}:</span>{' '}
              {document.filename}
            </div>
            <div>
              <span className="text-muted-foreground">{lang('documents.collection')}:</span>{' '}
              <Badge variant="outline">{document.collectionName}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{lang('documents.type')}:</span>{' '}
              {document.contentType.toUpperCase()}
            </div>
            <div>
              <span className="text-muted-foreground">{lang('documents.size')}:</span>{' '}
              {formatFileSize(document.fileSize)}
            </div>
            <div>
              <span className="text-muted-foreground">{lang('documents.status')}:</span>{' '}
              <Badge>{document.processingStatus}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground">{lang('documents.uploadedAt')}:</span>{' '}
              {new Date(document.createdAt).toLocaleString()}
            </div>
          </div>

          {/* Chunking Information Subgroup */}
          {documentData?.metadata && (() => {
            try {
              const metadata = typeof documentData.metadata === 'string' 
                ? JSON.parse(documentData.metadata) 
                : documentData.metadata;
              const processingConfig = metadata.processingConfig || {};
              
              return (
                <>
                  <Separator />
                  
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-medium">{lang('documents.chunkingInfo')}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{lang('documents.chunkingStrategy')}:</span>{' '}
                      {processingConfig.chunkingStrategy || 'N/A'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{lang('documents.chunkSize')}:</span>{' '}
                      {processingConfig.chunkSize || 'N/A'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{lang('documents.chunkOverlap')}:</span>{' '}
                      {processingConfig.chunkOverlap || 'N/A'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">{lang('documents.cleansingConfigUsed')}:</span>{' '}
                      {processingConfig.cleansingConfigId ? `Config #${processingConfig.cleansingConfigId}` : 'None'}
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">{lang('documents.totalChunks')}:</span>{' '}
                      <span className="font-medium">{chunks.length}</span>
                    </div>
                  </div>
                </>
              );
            } catch (error) {
              return null;
            }
          })()}

          <Separator />

          {/* Content Tabs */}
          {
            <Tabs defaultValue="chunks" className="flex-1">
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

              <TabsContent value="chunks">
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  {chunks.length === 0 ? (
                    <p className="text-muted-foreground">{lang('documents.noChunks')}</p>
                  ) : (
                    <div className="space-y-4">
                      {chunks.map((chunk) => (
                                                  <div key={chunk.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {lang('documents.chunk')} #{chunk.chunkIndex + 1}
                                </Badge>
                                {chunk.metadata?.startIndex !== undefined && chunk.metadata?.endIndex !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    ({chunk.metadata.startIndex} - {chunk.metadata.endIndex})
                                  </span>
                                )}
                              </div>
                              {chunk.tokenCount && (
                                <span className="text-sm text-muted-foreground">
                                  {chunk.tokenCount} tokens
                                </span>
                              )}
                            </div>
                            <div className="bg-muted p-3 rounded text-sm">
                              {chunk.cleanedContent || chunk.content}
                            </div>
                          </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="original">
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  {documentData?.rawContent ? (
                    <div className="bg-muted p-4 rounded-md">
                      <pre className="text-sm whitespace-pre-wrap">
                        {documentData.rawContent}
                      </pre>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground">
                      {lang('documents.noRawContent')}
                    </p>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="metadata">
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <pre className="text-sm">
                    {JSON.stringify(documentData?.metadata || {}, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          }
        </div>
      </DialogContent>
    </Dialog>
  );
}
