"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { RAGNavigation } from "../../components/rag-navigation";
import { CollectionForm } from "../../components/collection-form";

export default function CollectionRegisterPage() {
  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6">
        <CollectionForm />
      </div>
    </AdminLayout>
  );
}
