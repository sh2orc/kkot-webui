"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { useTranslation } from "@/lib/i18n";
import { CollectionManagement } from "../components/collection-management";
import { RAGNavigation } from "../components/rag-navigation";

export default function CollectionsPage() {
  const { lang } = useTranslation('admin.rag');

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('collections.title')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('collections.description')}
          </p>
        </div>
        
        <CollectionManagement />
      </div>
    </AdminLayout>
  );
}
