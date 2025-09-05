"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Save, Play, Upload } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import WorkflowEditor from "./components/workflow-editor"
import WorkflowList from "./components/workflow-list"
import WorkflowTemplates from "./components/workflow-templates"

export default function WorkflowPage() {
  const { lang } = useTranslation('admin.workflow')
  const [activeTab, setActiveTab] = useState("editor")
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 mt-1">{lang('description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            {lang('import')}
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {lang('newWorkflow')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-[600px]">
          <TabsTrigger value="editor">{lang('editor')}</TabsTrigger>
          <TabsTrigger value="list">{lang('myWorkflows')}</TabsTrigger>
          <TabsTrigger value="templates">{lang('templates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{selectedWorkflow?.name || lang('newWorkflow')}</CardTitle>
                  <CardDescription>
                    {selectedWorkflow?.description || lang('editorDescription')}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    {lang('save')}
                  </Button>
                  <Button size="sm">
                    <Play className="h-4 w-4 mr-2" />
                    {lang('test')}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <WorkflowEditor workflow={selectedWorkflow} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <WorkflowList onSelectWorkflow={setSelectedWorkflow} />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WorkflowTemplates onSelectTemplate={setSelectedWorkflow} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
