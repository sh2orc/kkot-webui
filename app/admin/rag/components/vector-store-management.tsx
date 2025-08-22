"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { VectorStoreDialog } from "./vector-store-dialog";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<VectorStore | null>(null);

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

  const handleCreate = () => {
    setEditingStore(null);
    setDialogOpen(true);
  };

  const handleEdit = (store: VectorStore) => {
    setEditingStore(store);
    setDialogOpen(true);
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

  const handleSave = async () => {
    await fetchVectorStores();
    setDialogOpen(false);
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

  if (loading) {
    return <div>{lang('loading')}</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{lang('vectorStores.title')}</CardTitle>
              <CardDescription>{lang('vectorStores.description')}</CardDescription>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {lang('vectorStores.add')}
            </Button>
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
              {vectorStores.map((store) => (
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(store)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
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
              {vectorStores.length === 0 && (
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

      <VectorStoreDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        vectorStore={editingStore}
        onSave={handleSave}
      />
    </>
  );
}
