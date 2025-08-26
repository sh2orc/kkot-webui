"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import { RAGNavigation } from "../../../components/rag-navigation";
import { VectorStoreForm } from "../../../components/vector-store-form";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

interface VectorStore {
  id: number;
  name: string;
  type: 'chromadb' | 'pgvector' | 'faiss';
  connectionString?: string;
  apiKey?: string;
  settings?: string;
  enabled: boolean;
  isDefault: boolean;
}

export default function VectorStoreEditPage() {
  const params = useParams();
  const { lang } = useTranslation('admin.rag');
  const [vectorStore, setVectorStore] = useState<VectorStore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVectorStore();
  }, [params.id]);

  const fetchVectorStore = async () => {
    try {
      const response = await fetch(`/api/rag/vector-stores/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch vector store');
      }
      const data = await response.json();
      setVectorStore(data.store);
    } catch (error) {
      console.error('Error fetching vector store:', error);
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6">
        {loading ? (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <Skeleton className="h-8 w-20" />
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-96" />
              </div>
            </div>
            <div className="border rounded-lg p-6 space-y-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : vectorStore ? (
          <VectorStoreForm vectorStore={vectorStore} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{lang('vectorStores.notFound')}</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
