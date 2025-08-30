"use client"

import { useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/lib/i18n"

export default function WebSearchSettingsPage() {
  const { lang } = useTranslation('admin.websearch')
  const [internetSearchEnabled, setInternetSearchEnabled] = useState(true)
  const [searchEngine, setSearchEngine] = useState("searchxng")
  const [searchXNGUrl, setSearchXNGUrl] = useState("")

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{lang('description')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{lang('title')}</CardTitle>
            <CardDescription>{lang('description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-500 dark:text-gray-400">{lang('developmentNotice')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{lang('internetSearch.title')}</CardTitle>
            <CardDescription>{lang('internetSearch.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">{lang('internetSearch.enabled.label')}</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">{lang('internetSearch.enabled.description')}</p>
              </div>
              <Switch checked={internetSearchEnabled} onCheckedChange={setInternetSearchEnabled} />
            </div>

            {internetSearchEnabled && (
              <div className="space-y-4 pl-4 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="search-engine">{lang('internetSearch.engine.label')}</Label>
                  <Select value={searchEngine} onValueChange={setSearchEngine}>
                    <SelectTrigger>
                      <SelectValue placeholder={lang('internetSearch.engine.placeholder')} />
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
                      <Label htmlFor="searchxng-url">{lang('internetSearch.searchxng.url.label')}</Label>
                      <Input
                        id="searchxng-url"
                        value={searchXNGUrl}
                        onChange={(e) => setSearchXNGUrl(e.target.value)}
                        placeholder={lang('internetSearch.searchxng.url.placeholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="searchxng-api-key">{lang('internetSearch.searchxng.apiKey.label')}</Label>
                      <Input 
                        id="searchxng-api-key" 
                        type="password" 
                        placeholder={lang('internetSearch.searchxng.apiKey.placeholder')} 
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
              <Button>{lang('saveButton')}</Button>
        </div>
      </div>
  )
} 
