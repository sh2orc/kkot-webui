"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { RAGNavigation } from "../../components/rag-navigation";
import { VectorStoreForm } from "../../components/vector-store-form";

export default function VectorStoreRegisterPage() {
  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6">
        <VectorStoreForm />
      </div>
    </AdminLayout>
  );
}
