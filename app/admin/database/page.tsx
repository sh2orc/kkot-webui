"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useTranslation } from "@/lib/i18n"
import { Database, RefreshCw, AlertTriangle, CheckCircle, Table } from "lucide-react"

export default function DatabaseSettingsPage() {
  const { lang } = useTranslation('admin.database')
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isTranslationsLoaded, setIsTranslationsLoaded] = useState(false)

  // Database status test function
  const testDbConnection = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/db-test')
      const data = await response.json()
      
      if (data.success) {
        setDbStatus(data.results)
      } else {
        setError(data.message || data.error || 'Unknown error occurred')
      }
    } catch (err: any) {
      setError(err.message || 'Database connection test failed')
    } finally {
      setIsLoading(false)
    }
  }

  // Test DB status on page load
  useEffect(() => {
    testDbConnection()
    // Mark translations as loaded after a short delay to ensure i18n is ready
    const timer = setTimeout(() => {
      setIsTranslationsLoaded(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Show loading if translations are not loaded
  if (!isTranslationsLoaded) {
    return (
      <div className="flex justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 dark:text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{lang('title')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{lang('description')}</p>
        </div>

        {/* Database status card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle>{lang('status.title')}</CardTitle>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={testDbConnection}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? lang('status.testing') : lang('status.test')}
              </Button>
            </div>
            <CardDescription>{lang('status.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{lang('status.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : dbStatus ? (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{lang('status.connected')}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{lang('status.type')}</h3>
                    <p className="font-medium">{dbStatus.dbType || 'sqlite'}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{lang('status.url')}</h3>
                    <p className="font-medium">{dbStatus.dbUrl || lang('status.defaultValue')}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{lang('status.users')}</h3>
                    <p className="font-medium">{dbStatus.existingUsers?.[0]?.count || 0}{lang('status.userCountUnit')}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{lang('status.lastChecked')}</h3>
                    <p className="font-medium">{new Date(dbStatus.timestamp).toLocaleString()}</p>
                  </div>
                </div>

                {/* Table statistics */}
                {dbStatus.tableCounts && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Table className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                      <h3 className="font-medium text-gray-700 dark:text-gray-300">{lang('tables.statistics')}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(dbStatus.tableCounts).map(([tableName, count]) => (
                        <div key={tableName} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                          <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                            {tableName.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {typeof count === 'number' ? count.toLocaleString() : String(count)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex justify-center py-4">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400 dark:text-gray-500 dark:text-gray-400" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Database settings card */}
        <Card>
          <CardHeader>
            <CardTitle>{lang('settings.title')}</CardTitle>
            <CardDescription>{lang('settings.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-500 dark:text-gray-400">{lang('development.message')}</p>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">{lang('development.environmentVariables')}</h4>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-3">
                  {lang('development.changeDescription')}
                </p>
                <div className="space-y-2">
                  <div className="font-mono text-xs bg-blue-100 dark:bg-blue-950/50 p-2 rounded border dark:border-blue-800">
                    <strong>DB_TYPE</strong>=sqlite|postgresql
                  </div>
                  <div className="font-mono text-xs bg-blue-100 dark:bg-blue-950/50 p-2 rounded border dark:border-blue-800">
                    <strong>DATABASE_URL</strong>=your-connection-string
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
  )
} 
