"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

interface RerankingStrategy {
  id: number;
  name: string;
  type: string;
  rerankingModelId: number | null;
  topK: number;
  minScore: string | null;
  settings: string | null;
  isDefault: boolean;
  modelName?: string;
  modelProvider?: string;
}

export function RerankingSettings() {
  const { lang } = useTranslation('admin.rag');
  const router = useRouter();
  const [strategies, setStrategies] = useState<RerankingStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/rag/reranking-strategies');
      if (!response.ok) throw new Error('Failed to fetch strategies');
      const data = await response.json();
      setStrategies(data.strategies);
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/rag/reranking-strategies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete strategy');

      toast.success(lang('success.deleted'));
      fetchStrategies();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };

  const handleAdd = () => {
    router.push('/admin/rag/settings/reranking/new');
  };

  const handleEdit = (id: number) => {
    router.push(`/admin/rag/settings/reranking/${id}`);
  };

  const getTypeDisplay = (type: string) => {
    switch (type) {
      case 'model_based':
        return lang('reranking.types.model_based');
      case 'rule_based':
        return lang('reranking.types.rule_based');
      case 'hybrid':
        return lang('reranking.types.hybrid');
      case 'none':
        return lang('reranking.types.none');
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang('reranking.title')}</CardTitle>
        <CardDescription>{lang('reranking.description')}</CardDescription>
        <div className="flex items-center justify-end">
          <Button size="sm" disabled={loading} onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            {lang('reranking.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang('reranking.name')}</TableHead>
              <TableHead>{lang('reranking.type')}</TableHead>
              <TableHead>{lang('reranking.model')}</TableHead>
              <TableHead>{lang('reranking.topK')}</TableHead>
              <TableHead>{lang('reranking.minScore')}</TableHead>
              <TableHead className="text-right">{lang('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <>
                {[...Array(3)].map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
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
            {!loading && strategies.map((strategy) => (
              <TableRow key={strategy.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {strategy.name}
                    {strategy.isDefault && (
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{getTypeDisplay(strategy.type)}</Badge>
                </TableCell>
                <TableCell>
                  {strategy.modelName ? (
                    <span className="text-sm">
                      {strategy.modelName}
                      {strategy.modelProvider && (
                        <span className="text-muted-foreground ml-1">
                          ({strategy.modelProvider})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>{strategy.topK}</TableCell>
                <TableCell>{strategy.minScore || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(strategy.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(strategy.id)}
                      disabled={strategy.isDefault}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && strategies.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {lang('reranking.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
