"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { CollectionForm } from "../../../components/collection-form";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";

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
}

export default function CollectionEditPage() {
  const params = useParams();
  const { lang } = useTranslation('admin.rag');
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollection();
  }, [params.id]);

  const fetchCollection = async () => {
    try {
      const response = await fetch(`/api/rag/collections/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch collection');
      }
      const data = await response.json();
      setCollection(data.collection);
    } catch (error) {
      console.error('Error fetching collection:', error);
      toast.error(lang('errors.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
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
        ) : collection ? (
          <CollectionForm collection={collection} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{lang('collections.notFound')}</p>
          </div>
        )}
    </div>
  );
}
