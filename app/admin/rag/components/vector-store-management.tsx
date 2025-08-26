"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface VectorStore {
  id: number;
  name: string;
  type: 'chromadb' | 'pgvector' | 'faiss';
  connectionString?: string;
  enabled: boolean;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export function VectorStoreManagement() {
  const { lang } = useTranslation('admin.rag');
  const [vectorStores, setVectorStores] = useState<VectorStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVectorStores();
  }, []);

  const fetchVectorStores = async () => {
    try {
      const response = await fetch('/api/rag/vector-stores');
      if (!response.ok) throw new Error('Failed to fetch vector stores');
      const data = await response.json();
      setVectorStores(data.stores);
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/rag/vector-stores/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete vector store');

      toast.success(lang('success.deleted'));
      fetchVectorStores();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chromadb':
        return 'bg-blue-100 text-blue-800';
      case 'pgvector':
        return 'bg-green-100 text-green-800';
      case 'faiss':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };



  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-end">
            <Link href="/admin/rag/vector-stores/register">
              <Button disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {lang('vectorStores.add')}
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{lang('vectorStores.name')}</TableHead>
                <TableHead>{lang('vectorStores.type')}</TableHead>
                <TableHead>{lang('vectorStores.connection')}</TableHead>
                <TableHead>{lang('vectorStores.status')}</TableHead>
                <TableHead>{lang('vectorStores.default')}</TableHead>
                <TableHead className="text-right">{lang('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <>
                  {[...Array(3)].map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
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
              {!loading && vectorStores.map((store) => (
                <TableRow key={store.id}>
                  <TableCell className="font-medium">{store.name}</TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(store.type)}>
                      {store.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {store.connectionString || '-'}
                  </TableCell>
                  <TableCell>
                    {store.enabled ? (
                      <Badge variant="outline" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {lang('enabled')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-600">
                        <XCircle className="h-3 w-3 mr-1" />
                        {lang('disabled')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {store.isDefault && (
                      <Badge variant="default">{lang('default')}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/rag/vector-stores/edit/${store.id}`}>
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
                        onClick={() => handleDelete(store.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && vectorStores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {lang('vectorStores.empty')}
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
