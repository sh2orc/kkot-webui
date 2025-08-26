"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Upload, Trash2, RefreshCw, FileText, Search, Download, Eye, Copy, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { DocumentUploadDialog } from "./document-upload-dialog";
import { DocumentRegenerateDialog } from "./document-regenerate-dialog";
import { CollectionCopyDialog } from "./collection-copy-dialog";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

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
  metadata?: string;
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
  const [regenerateDialogOpen, setRegenerateDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [collectionCopyDialogOpen, setCollectionCopyDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [selectedCollection]);

  // Auto-refresh documents if any are processing
  useEffect(() => {
    const processingDocuments = documents.filter(doc => 
      doc.processingStatus === 'processing' || doc.processingStatus === 'pending'
    );
    
    if (processingDocuments.length > 0) {
      const interval = setInterval(() => {
        console.log('Auto-refreshing documents due to processing status...');
        fetchDocuments();
      }, 3000); // Check every 3 seconds
      
      return () => clearInterval(interval);
    }
  }, [documents]);

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

  const handleRegenerateClick = (document: Document) => {
    setSelectedDocument(document);
    setRegenerateDialogOpen(true);
  };

  const handleRegenerateComplete = () => {
    fetchDocuments();
    setRegenerateDialogOpen(false);
    setSelectedDocument(null);
  };

  const handleCollectionCopyComplete = () => {
    fetchCollections();
    setCollectionCopyDialogOpen(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchMode(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionId: selectedCollection === 'all' ? null : parseInt(selectedCollection),
          query: searchQuery,
          topK: 20
        })
      });

      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setSearchResults(data.results);
      setSearchMode(true);
      
      const collectionText = selectedCollection === 'all' ? lang('documents.allCollections') : lang('documents.selectedCollection');
      toast.success(lang('documents.searchResultsFound').replace('{{count}}', data.results.length.toString()));
    } catch (error) {
      toast.error(lang('documents.searchFailed'));
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchMode(false);
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

  const filteredDocuments = searchMode 
    ? [] 
    : documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
      );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setCollectionCopyDialogOpen(true)}
              disabled={collections.length === 0 || loading}
            >
              <Copy className="h-4 w-4 mr-2" />
              {lang('collections.copy')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                setLoading(true);
                fetchDocuments();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {lang('documents.refresh')}
            </Button>
            <Button onClick={() => setUploadDialogOpen(true)} disabled={collections.length === 0 || loading}>
              <Upload className="h-4 w-4 mr-2" />
              {lang('documents.upload')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Select value={selectedCollection} onValueChange={setSelectedCollection} disabled={loading}>
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
                placeholder={searchMode ? lang('documents.embeddingSearchPlaceholder') : lang('documents.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
                disabled={loading}
              />
            </div>
            
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              variant="outline"
            >
              {isSearching ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isSearching ? lang('documents.searching') : lang('documents.search')}
            </Button>
            
            {searchMode && (
              <Button onClick={clearSearch} variant="ghost">
                {lang('documents.clearSearch')}
              </Button>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                {searchMode ? (
                  <>
                    <TableHead>{lang('documents.searchResults.document')}</TableHead>
                    <TableHead>{lang('documents.searchResults.collection')}</TableHead>
                    <TableHead>{lang('documents.searchResults.chunkContent')}</TableHead>
                    <TableHead>{lang('documents.searchResults.similarity')}</TableHead>
                    <TableHead className="text-right">{lang('documents.searchResults.actions')}</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead>{lang('documents.filename')}</TableHead>
                    <TableHead>{lang('documents.collection')}</TableHead>
                    <TableHead>{lang('documents.type')}</TableHead>
                    <TableHead>{lang('documents.size')}</TableHead>
                    <TableHead>{lang('documents.status.title')}</TableHead>
                    <TableHead>{lang('documents.uploadedAt')}</TableHead>
                    <TableHead className="text-right">{lang('actions')}</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <>
                  {[...Array(5)].map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-4 rounded" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-28" />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}
              {!loading && searchMode && searchResults.map((result, index) => (
                <TableRow key={`search-${index}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{result.document?.title || 'Unknown Document'}</div>
                        <div className="text-sm text-muted-foreground">
                          {result.document?.filename}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {result.collectionName && (
                      <Badge variant="transparent">{result.collectionName}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <div className="text-sm truncate">
                      {result.content?.substring(0, 150) + (result.content?.length > 150 ? '...' : '')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {(result.score * 100).toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {result.document && (
                      <Link href={`/admin/rag/documents/view/${result.document.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !searchMode && filteredDocuments.map((document) => (
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
                    <Badge variant="transparent">{document.collectionName}</Badge>
                  </TableCell>
                  <TableCell>{document.contentType.toUpperCase()}</TableCell>
                  <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-center justify-center">
                      {getStatusBadge(document.processingStatus)}
                      {document.errorMessage && (
                        <div className="mt-1">
                          <p className="text-xs text-destructive font-medium">Error:</p>
                          <p className="text-xs text-destructive break-words max-w-xs">
                            {document.errorMessage}
                          </p>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(document.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/rag/documents/view/${document.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          title={lang('documents.view')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerateClick(document)}
                        title={lang('documents.regenerate')}
                      >
                        <Wand2 className="h-4 w-4" />
                      </Button>
                      {document.processingStatus === 'failed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReprocess(document.id)}
                          title={lang('documents.reprocess')}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(document.id)}
                        title={lang('delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && searchMode && searchResults.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {lang('documents.noSearchResults')}
                  </TableCell>
                </TableRow>
              )}
              {!loading && !searchMode && filteredDocuments.length === 0 && (
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
      
      <DocumentRegenerateDialog
        open={regenerateDialogOpen}
        onOpenChange={setRegenerateDialogOpen}
        document={selectedDocument}
        collections={collections}
        onRegenerateComplete={handleRegenerateComplete}
      />
      
      <CollectionCopyDialog
        open={collectionCopyDialogOpen}
        onOpenChange={setCollectionCopyDialogOpen}
        collections={collections}
        onCopyComplete={handleCollectionCopyComplete}
      />
    </>
  );
}
