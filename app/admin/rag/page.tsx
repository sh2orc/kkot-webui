"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, FolderOpen, Settings, Search } from "lucide-react";
import { VectorStoreManagement } from "./components/vector-store-management";
import { CollectionManagement } from "./components/collection-management";
import { DocumentManagement } from "./components/document-management";
import { ChunkingSettings } from "./components/chunking-settings";
import { CleansingSettings } from "./components/cleansing-settings";

export default function RAGPage() {
  const { lang } = useTranslation('admin.rag');
  const [activeTab, setActiveTab] = useState("vector-stores");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{lang('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {lang('description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="vector-stores">
            <Database className="h-4 w-4 mr-2" />
            {lang('tabs.vectorStores')}
          </TabsTrigger>
          <TabsTrigger value="collections">
            <FolderOpen className="h-4 w-4 mr-2" />
            {lang('tabs.collections')}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <Search className="h-4 w-4 mr-2" />
            {lang('tabs.documents')}
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            {lang('tabs.settings')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vector-stores" className="space-y-4">
          <VectorStoreManagement />
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <CollectionManagement />
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <DocumentManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="grid gap-4">
            <ChunkingSettings />
            <CleansingSettings />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
