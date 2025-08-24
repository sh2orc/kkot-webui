"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { useTranslation } from "@/lib/i18n";
import { VectorStoreManagement } from "../components/vector-store-management";
import { RAGNavigation } from "../components/rag-navigation";

export default function VectorStoresPage() {
  const { lang } = useTranslation('admin.rag');

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('vectorStores.title')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('vectorStores.description')}
          </p>
        </div>
        
        <VectorStoreManagement />
      </div>
    </AdminLayout>
  );
}
