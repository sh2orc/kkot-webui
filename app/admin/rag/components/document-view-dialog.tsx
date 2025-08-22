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
}

interface DocumentChunk {
  id: string;
  chunkIndex: number;
  content: string;
  cleanedContent?: string;
  tokenCount?: number;
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

          <Separator />

          {/* Content Tabs */}
          {loading ? (
            <div className="text-center py-8">{lang('loading')}</div>
          ) : (
            <Tabs defaultValue="chunks" className="flex-1">
              <TabsList>
                <TabsTrigger value="chunks">
                  {lang('documents.chunks')} ({chunks.length})
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
                            <Badge variant="outline">
                              {lang('documents.chunk')} #{chunk.chunkIndex + 1}
                            </Badge>
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

              <TabsContent value="metadata">
                <ScrollArea className="h-[400px] rounded-md border p-4">
                  <pre className="text-sm">
                    {JSON.stringify(documentData?.metadata || {}, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
