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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<ChunkingStrategy | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'fixed-size',
    chunkSize: 1000,
    chunkOverlap: 200,
  });

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

  const handleAdd = () => {
    setEditingStrategy(null);
    setFormData({
      name: '',
      type: 'fixed-size',
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    setDialogOpen(true);
  };

  const handleEdit = (strategy: ChunkingStrategy) => {
    setEditingStrategy(strategy);
    setFormData({
      name: strategy.name,
      type: strategy.type,
      chunkSize: strategy.chunkSize,
      chunkOverlap: strategy.chunkOverlap,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      const url = editingStrategy 
        ? `/api/rag/chunking-strategies/${editingStrategy.id}`
        : '/api/rag/chunking-strategies';
      
      const response = await fetch(url, {
        method: editingStrategy ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save strategy');

      toast.success(lang(editingStrategy ? 'success.updated' : 'success.created'));
      setDialogOpen(false);
      fetchStrategies();
    } catch (error) {
      toast.error(lang('errors.saveFailed'));
    }
  };



  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-end">
          <Button size="sm" disabled={loading} onClick={handleAdd}>
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
                  <Badge variant="outline">{strategy.type}</Badge>
                </TableCell>
                <TableCell>{strategy.chunkSize}</TableCell>
                <TableCell>{strategy.chunkOverlap}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEdit(strategy)}
                    >
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
            {!loading && strategies.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {lang('chunking.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingStrategy ? lang('chunking.edit') : lang('chunking.add')}
            </DialogTitle>
            <DialogDescription>
              {editingStrategy ? lang('chunking.editDescription') : lang('chunking.addDescription')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{lang('chunking.name')}</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={lang('chunking.namePlaceholder')}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="type">{lang('chunking.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed-size">Fixed Size</SelectItem>
                  <SelectItem value="sentence">Sentence</SelectItem>
                  <SelectItem value="paragraph">Paragraph</SelectItem>
                  <SelectItem value="sliding-window">Sliding Window</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="chunkSize">{lang('chunking.chunkSize')}</Label>
              <Input
                id="chunkSize"
                type="number"
                value={formData.chunkSize}
                onChange={(e) => setFormData({ ...formData, chunkSize: parseInt(e.target.value) || 0 })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="chunkOverlap">{lang('chunking.overlap')}</Label>
              <Input
                id="chunkOverlap"
                type="number"
                value={formData.chunkOverlap}
                onChange={(e) => setFormData({ ...formData, chunkOverlap: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {lang('cancel')}
            </Button>
            <Button onClick={handleSave}>
              {lang('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
