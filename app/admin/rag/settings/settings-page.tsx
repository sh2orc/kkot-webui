"use client";

import AdminLayout from "@/components/admin/admin-layout";
import { useTranslation } from "@/lib/i18n";
import { ChunkingSettings } from "../components/chunking-settings";
import { CleansingSettings } from "../components/cleansing-settings";
import { RAGNavigation } from "../components/rag-navigation";

export default function SettingsPage() {
  const { lang } = useTranslation('admin.rag');

  return (
    <AdminLayout>
      <RAGNavigation />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('tabs.settings')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('settings.description')}
          </p>
        </div>
        
        <div className="grid gap-4">
          <ChunkingSettings />
          <CleansingSettings />
        </div>
      </div>
    </AdminLayout>
  );
}
