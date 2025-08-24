"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { useTranslation } from "@/lib/i18n";
import { DocumentManagement } from "../components/document-management";
import { RAGNavigation } from "../components/rag-navigation";

export default function DocumentsPage() {
  const { lang } = useTranslation('admin.rag');

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('documents.title')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('documents.description')}
          </p>
        </div>
        
        <DocumentManagement />
      </div>
    </AdminLayout>
  );
}
