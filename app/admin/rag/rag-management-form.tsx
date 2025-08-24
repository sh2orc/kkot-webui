"use client";

import React from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/admin-layout";
import { useTranslation } from "@/lib/i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, FolderOpen, Settings, Search, ArrowRight, Plus } from "lucide-react";


export default function RAGManagementForm() {
  const router = useRouter();
  const { lang } = useTranslation('admin.rag');
  
  const navigateTo = (path: string) => {
    router.push(`/admin/rag/${path}`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">
            {lang('description')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vector Stores Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('vector-stores')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Database className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{lang('tabs.vectorStores')}</CardTitle>
                    <CardDescription>
                      {lang('vectorStores.description')}
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{lang('vectorStores.manage')}</span>
                <Button variant="ghost" size="sm">
                  {lang('common.manage')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Collections Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('collections')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FolderOpen className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{lang('tabs.collections')}</CardTitle>
                    <CardDescription>
                      {lang('collections.description')}
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{lang('collections.manage')}</span>
                <Button variant="ghost" size="sm">
                  {lang('common.manage')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('documents')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Search className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{lang('tabs.documents')}</CardTitle>
                    <CardDescription>
                      {lang('documents.description')}
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{lang('documents.manage')}</span>
                <Button variant="ghost" size="sm">
                  {lang('common.manage')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Settings Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigateTo('settings')}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Settings className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{lang('tabs.settings')}</CardTitle>
                    <CardDescription>
                      {lang('settings.description')}
                    </CardDescription>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>{lang('settings.manage')}</span>
                <Button variant="ghost" size="sm">
                  {lang('common.configure')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{lang('quickActions.title')}</CardTitle>
            <CardDescription>
              {lang('quickActions.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigateTo('vector-stores')} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {lang('quickActions.addVectorStore')}
              </Button>
              <Button onClick={() => navigateTo('collections')} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {lang('quickActions.createCollection')}
              </Button>
              <Button onClick={() => navigateTo('documents')} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                {lang('quickActions.uploadDocument')}
              </Button>
              <Button onClick={() => navigateTo('settings')} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                {lang('quickActions.configureSettings')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
