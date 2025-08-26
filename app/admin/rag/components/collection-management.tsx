"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, FolderOpen, Database } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface Collection {
  id: number;
  vectorStoreId: number;
  name: string;
  description?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  defaultChunkingStrategyId?: number;
  defaultCleansingConfigId?: number;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
  vectorStoreName?: string;
  vectorStoreType?: string;
  chunkingStrategyName?: string;
  cleansingConfigName?: string;
  stats?: {
    documentCount: number;
    dimensionality: number;
    indexType?: string;
  };
}

interface VectorStore {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
}

export function CollectionManagement() {
  const { lang } = useTranslation('admin.rag');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
  const [selectedVectorStore, setSelectedVectorStore] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVectorStores();
    fetchCollections();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [selectedVectorStore]);

  const fetchVectorStores = async () => {
    try {
      const response = await fetch('/api/rag/vector-stores');
      if (!response.ok) throw new Error('Failed to fetch vector stores');
      const data = await response.json();
      setVectorStores(data.stores.filter((store: VectorStore) => store.enabled));
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    }
  };

  const fetchCollections = async () => {
    try {
      let url = '/api/rag/collections';
      if (selectedVectorStore !== 'all') {
        url += `?vectorStoreId=${selectedVectorStore}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch collections');
      const data = await response.json();
      setCollections(data.collections);
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/rag/collections/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete collection');

      toast.success(lang('success.deleted'));
      fetchCollections();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };





  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end gap-2">
            <Select value={selectedVectorStore} onValueChange={setSelectedVectorStore} disabled={loading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{lang('collections.allVectorStores')}</SelectItem>
                {vectorStores.map((store) => (
                  <SelectItem key={store.id} value={store.id.toString()}>
                    <div className="flex items-center gap-2">
                      <Database className="h-3 w-3" />
                      {store.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Link href="/admin/rag/collections/register">
              <Button disabled={vectorStores.length === 0 || loading}>
                <Plus className="h-4 w-4 mr-2" />
                {lang('collections.add')}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang('collections.name')}</TableHead>
                <TableHead>{lang('collections.vectorStore')}</TableHead>
                <TableHead>{lang('collections.embeddingModel')}</TableHead>
                <TableHead>{lang('collections.chunkingStrategy')}</TableHead>
                <TableHead>{lang('collections.cleansingConfig')}</TableHead>
                <TableHead>{lang('collections.documents')}</TableHead>
                <TableHead>{lang('collections.status')}</TableHead>
                <TableHead className="text-right">{lang('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <>
                  {[...Array(4)].map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-36" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-28" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
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
              {!loading && collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{collection.name}</div>
                      {collection.description && (
                        <div className="text-sm text-muted-foreground">
                          {collection.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="transparent">
                      {collection.vectorStoreName}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="transparent">
                      {collection.embeddingModel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="transparent">
                      {collection.chunkingStrategyName || lang('collections.noChunkingStrategy')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="transparent">
                      {collection.cleansingConfigName || lang('collections.noCleansingConfig')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {collection.stats?.documentCount || 0}
                  </TableCell>
                  <TableCell>
                    <Badge variant={collection.isActive ? "default" : "secondary"}>
                      {collection.isActive ? lang('active') : lang('inactive')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/rag/collections/edit/${collection.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(collection.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && collections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {vectorStores.length === 0
                      ? lang('collections.noVectorStores')
                      : lang('collections.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>


    </>
  );
}
