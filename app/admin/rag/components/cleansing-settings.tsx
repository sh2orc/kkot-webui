"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Star, Bot } from "lucide-react";
import { toast } from "sonner";

interface CleansingConfig {
  id: number;
  name: string;
  llmModelId?: number;
  llmModelName?: string;
  removeHeaders: boolean;
  removeFooters: boolean;
  removePageNumbers: boolean;
  normalizeWhitespace: boolean;
  fixEncoding: boolean;
  isDefault: boolean;
}

export function CleansingSettings() {
  const { lang } = useTranslation('admin.rag');
  const [configs, setConfigs] = useState<CleansingConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/rag/cleansing-configs');
      if (!response.ok) throw new Error('Failed to fetch configs');
      const data = await response.json();
      setConfigs(data.configs);
    } catch (error) {
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(lang('confirmDelete'))) return;

    try {
      const response = await fetch(`/api/rag/cleansing-configs/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete config');

      toast.success(lang('success.deleted'));
      fetchConfigs();
    } catch (error) {
      toast.error(lang('errors.deleteFailed'));
    }
  };

  // if (loading) {
  //   return <div>{lang('loading')}</div>;
  // }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {lang('cleansing.add')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{lang('cleansing.name')}</TableHead>
              <TableHead>{lang('cleansing.llmModel')}</TableHead>
              <TableHead>{lang('cleansing.rules')}</TableHead>
              <TableHead className="text-right">{lang('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {configs.map((config) => (
              <TableRow key={config.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {config.name}
                    {config.isDefault && (
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {config.llmModelName ? (
                    <Badge variant="outline">
                      <Bot className="h-3 w-3 mr-1" />
                      {config.llmModelName}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">{lang('cleansing.basicOnly')}</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {config.removeHeaders && <Badge variant="secondary">Headers</Badge>}
                    {config.removeFooters && <Badge variant="secondary">Footers</Badge>}
                    {config.removePageNumbers && <Badge variant="secondary">Page#</Badge>}
                    {config.normalizeWhitespace && <Badge variant="secondary">Whitespace</Badge>}
                    {config.fixEncoding && <Badge variant="secondary">Encoding</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {configs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {lang('cleansing.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
