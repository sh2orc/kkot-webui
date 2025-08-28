"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { RerankingForm } from "../../../components/reranking-form";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface RerankingStrategy {
  id: number;
  name: string;
  type: string;
  rerankingModelId?: number | null;
  topK: number;
  minScore?: string | null;
  settings?: string | null;
  isDefault: boolean;
}

export default function EditRerankingStrategyPage() {
  const params = useParams();
  const [strategy, setStrategy] = useState<RerankingStrategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStrategy();
  }, [params.id]);

  const fetchStrategy = async () => {
    try {
      const response = await fetch(`/api/rag/reranking-strategies/${params.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch strategy');
      }
      const data = await response.json();
      setStrategy(data.strategy);
    } catch (error) {
      console.error('Error fetching strategy:', error);
      toast.error('Failed to load strategy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-8" />
              <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        ) : strategy ? (
          <RerankingForm strategy={strategy} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Strategy not found</p>
          </div>
        )}
    </div>
  );
}
