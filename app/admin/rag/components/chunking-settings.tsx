"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star } from "lucide-react";
import { toast } from "sonner";

interface ChunkingStrategy {
  id: number;
  name: string;
  type: string;
  chunkSize: number;
  chunkOverlap: number;
  isDefault: boolean;
}

export function ChunkingSettings() {
  const { lang } = useTranslation('admin.rag');
  const [strategies, setStrategies] = useState<ChunkingStrategy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const response = await fetch('/api/rag/chunking-strategies');
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
      const response = await fetch(`/api/rag/chunking-strategies/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete strategy');

      toast.success(lang('success.deleted'));
      fetchStrategies();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };

  if (loading) {
    return <div>{lang('loading')}</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{lang('chunking.title')}</CardTitle>
            <CardDescription>{lang('chunking.description')}</CardDescription>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {lang('chunking.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang('chunking.name')}</TableHead>
              <TableHead>{lang('chunking.type')}</TableHead>
              <TableHead>{lang('chunking.chunkSize')}</TableHead>
              <TableHead>{lang('chunking.overlap')}</TableHead>
              <TableHead className="text-right">{lang('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {strategies.map((strategy) => (
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
                  <Badge variant="outline">{strategy.type}</Badge>
                </TableCell>
                <TableCell>{strategy.chunkSize}</TableCell>
                <TableCell>{strategy.chunkOverlap}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(strategy.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {strategies.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {lang('chunking.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
