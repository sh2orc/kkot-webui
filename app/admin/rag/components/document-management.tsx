"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, RefreshCw, FileText, Search, Download, Eye } from "lucide-react";
import { toast } from "sonner";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { DocumentViewDialog } from "./document-view-dialog";

interface Document {
  id: number;
  collectionId: number;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  contentType: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  collectionName?: string;
}

interface Collection {
  id: number;
  name: string;
  isActive: boolean;
}

export function DocumentManagement() {
  const { lang } = useTranslation('admin.rag');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCollection]);

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/rag/collections');
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      setCollections(data.collections.filter((col: any) => col.isActive));
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    }
  };

  const fetchDocuments = async () => {
    try {
      let url = '/api/rag/documents';
      if (selectedCollection !== 'all') {
        url += `?collectionId=${selectedCollection}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch documents');
      const data = await response.json();
      setDocuments(data.documents);
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/rag/documents/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete document');

      toast.success(lang('success.deleted'));
      fetchDocuments();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };

  const handleReprocess = async (id: number) => {
    try {
      const response = await fetch(`/api/rag/documents/${id}/reprocess`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error('Failed to reprocess document');

      toast.success(lang('documents.reprocessQueued'));
      fetchDocuments();
    } catch (error) {
      toast.error(lang('errors.reprocessFailed'));
    }
  };

  const handleUploadComplete = () => {
    fetchDocuments();
    setUploadDialogOpen(false);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end">
            <Button onClick={() => setUploadDialogOpen(true)} disabled={collections.length === 0}>
              <Upload className="h-4 w-4 mr-2" />
              {lang('documents.upload')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedCollection} onValueChange={setSelectedCollection}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang('documents.allCollections')}</SelectItem>
                {collections.map((collection) => (
                  <SelectItem key={collection.id} value={collection.id.toString()}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={lang('documents.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang('documents.filename')}</TableHead>
                <TableHead>{lang('documents.collection')}</TableHead>
                <TableHead>{lang('documents.type')}</TableHead>
                <TableHead>{lang('documents.size')}</TableHead>
                <TableHead>{lang('documents.status')}</TableHead>
                <TableHead>{lang('documents.uploadedAt')}</TableHead>
                <TableHead className="text-right">{lang('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((document) => (
                <TableRow key={document.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{document.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {document.filename}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{document.collectionName}</Badge>
                  </TableCell>
                  <TableCell>{document.contentType.toUpperCase()}</TableCell>
                  <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {getStatusBadge(document.processingStatus)}
                      {document.errorMessage && (
                        <span className="text-xs text-destructive">
                          {document.errorMessage}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(document.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingDocument(document)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {document.processingStatus === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReprocess(document.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredDocuments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {collections.length === 0
                      ? lang('documents.noCollections')
                      : lang('documents.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        collections={collections}
        onUploadComplete={handleUploadComplete}
      />

      {viewingDocument && (
        <DocumentViewDialog
          open={!!viewingDocument}
          onOpenChange={(open) => !open && setViewingDocument(null)}
          document={viewingDocument}
        />
      )}
    </>
  );
}
