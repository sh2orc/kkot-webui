"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, FolderOpen, Settings, Search } from "lucide-react";

export function RAGNavigation() {
  const { lang } = useTranslation('admin.rag');
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab from current path
  const getActiveTab = () => {
    if (pathname.includes('/vector-stores')) return 'vector-stores';
    if (pathname.includes('/collections')) return 'collections';
    if (pathname.includes('/documents')) return 'documents';
    if (pathname.includes('/settings')) return 'settings';
    return 'vector-stores'; // Default value
  };

  const handleTabChange = (value: string) => {
    router.push(`/admin/rag/${value}`);
  };

  return (
    <div className="border-b bg-white sticky top-0 z-10">
      <div className="px-6 py-4">
        <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vector-stores" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.vectorStores')}</span>
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.collections')}</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.documents')}</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">{lang('tabs.settings')}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
