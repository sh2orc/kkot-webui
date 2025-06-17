"use client"

import { useState } from "react"
import AdminLayout from "../../../components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

export default function WebSearchSettingsPage() {
  const [internetSearchEnabled, setInternetSearchEnabled] = useState(true)
  const [searchEngine, setSearchEngine] = useState("searchxng")
  const [searchXNGUrl, setSearchXNGUrl] = useState("")

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">웹검색 설정</h1>
          <p className="text-gray-600 mt-1">실시간 인터넷 검색 기능을 설정합니다.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>웹 검색 설정</CardTitle>
            <CardDescription>실시간 인터넷 검색 기능을 설정합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">인터넷 검색</Label>
                <p className="text-sm text-gray-500">실시간 인터넷 검색 기능을 제공합니다.</p>
              </div>
              <Switch checked={internetSearchEnabled} onCheckedChange={setInternetSearchEnabled} />
            </div>

            {internetSearchEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="search-engine">검색 엔진</Label>
                  <Select value={searchEngine} onValueChange={setSearchEngine}>
                    <SelectTrigger>
                      <SelectValue placeholder="검색 엔진 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="searchxng">SearchXNG</SelectItem>
                      <SelectItem value="google">Google</SelectItem>
                      <SelectItem value="bing">Bing</SelectItem>
                      <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {searchEngine === "searchxng" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="searchxng-url">SearchXNG URL</Label>
                      <Input
                        id="searchxng-url"
                        value={searchXNGUrl}
                        onChange={(e) => setSearchXNGUrl(e.target.value)}
                        placeholder="https://your-searchxng-instance.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="searchxng-api-key">API 키 (선택사항)</Label>
                      <Input id="searchxng-api-key" type="password" placeholder="SearchXNG API 키 (필요한 경우)" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button className="bg-black text-white hover:bg-gray-800">저장</Button>
        </div>
      </div>
    </AdminLayout>
  )
} 