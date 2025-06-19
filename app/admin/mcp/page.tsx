"use client"

import AdminLayout from "@/components/admin/admin-layout"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, Edit, Trash2, Settings, Play, Square, RefreshCw } from "lucide-react"
import { useState } from "react"

interface MCPServer {
  id: string
  name: string
  command: string
  args: string[]
  env?: Record<string, string>
  status: "running" | "stopped" | "error"
  description?: string
  type: "builtin" | "custom"
  lastStarted?: Date
}

const builtinMCPs = [
  {
    id: "filesystem",
    name: "File System",
    description: "파일 시스템 접근 및 관리",
    command: "npx",
    args: ["@modelcontextprotocol/server-filesystem"],
    type: "builtin" as const
  },
  {
    id: "github",
    name: "GitHub",
    description: "GitHub 저장소 및 이슈 관리",
    command: "npx",
    args: ["@modelcontextprotocol/server-github"],
    type: "builtin" as const
  },
  {
    id: "sqlite",
    name: "SQLite",
    description: "SQLite 데이터베이스 관리",
    command: "npx",
    args: ["@modelcontextprotocol/server-sqlite"],
    type: "builtin" as const
  },
  {
    id: "brave-search",
    name: "Brave Search",
    description: "Brave 검색 엔진 통합",
    command: "npx",
    args: ["@modelcontextprotocol/server-brave-search"],
    type: "builtin" as const
  },
  {
    id: "puppeteer",
    name: "Puppeteer",
    description: "웹 스크래핑 및 자동화",
    command: "npx",
    args: ["@modelcontextprotocol/server-puppeteer"],
    type: "builtin" as const
  }
]

export default function MCPSettingsPage() {
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([
    {
      id: "fs-1",
      name: "Local File System",
      command: "npx",
      args: ["@modelcontextprotocol/server-filesystem", "/home/user/documents"],
      status: "running",
      description: "로컬 문서 폴더 접근",
      type: "custom",
      lastStarted: new Date()
    }
  ])
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingServer, setEditingServer] = useState<MCPServer | null>(null)
  const [newServer, setNewServer] = useState({
    name: "",
    command: "",
    args: "",
    env: "",
    description: ""
  })

  const handleAddServer = () => {
    const server: MCPServer = {
      id: Date.now().toString(),
      name: newServer.name,
      command: newServer.command,
      args: newServer.args.split(" ").filter(arg => arg.trim()),
      env: newServer.env ? JSON.parse(newServer.env) : undefined,
      description: newServer.description,
      status: "stopped",
      type: "custom"
    }
    
    setMcpServers([...mcpServers, server])
    setNewServer({ name: "", command: "", args: "", env: "", description: "" })
    setIsAddDialogOpen(false)
  }

  const handleDeleteServer = (id: string) => {
    setMcpServers(mcpServers.filter(server => server.id !== id))
  }

  const handleStartServer = (id: string) => {
    setMcpServers(mcpServers.map(server => 
      server.id === id 
        ? { ...server, status: "running" as const, lastStarted: new Date() }
        : server
    ))
  }

  const handleStopServer = (id: string) => {
    setMcpServers(mcpServers.map(server => 
      server.id === id 
        ? { ...server, status: "stopped" as const }
        : server
    ))
  }

  const addBuiltinMCP = (builtin: typeof builtinMCPs[0]) => {
    const server: MCPServer = {
      id: Date.now().toString(),
      name: builtin.name,
      command: builtin.command,
      args: builtin.args,
      description: builtin.description,
      status: "stopped",
      type: "builtin"
    }
    
    setMcpServers([...mcpServers, server])
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">MCP 설정</h1>
          <p className="text-gray-600 mt-1">Model Context Protocol 서버를 관리합니다.</p>
        </div>

        <Tabs defaultValue="servers" className="space-y-4">
          <TabsList>
            <TabsTrigger value="servers">MCP 서버</TabsTrigger>
            <TabsTrigger value="builtin">내장 MCP</TabsTrigger>
            <TabsTrigger value="settings">전역 설정</TabsTrigger>
          </TabsList>

          <TabsContent value="servers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>등록된 MCP 서버</CardTitle>
                  <CardDescription>현재 등록된 MCP 서버들을 관리합니다.</CardDescription>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      새 서버 추가
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>새 MCP 서버 추가</DialogTitle>
                      <DialogDescription>
                        새로운 MCP 서버를 등록합니다.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="server-name">서버 이름</Label>
                        <Input
                          id="server-name"
                          value={newServer.name}
                          onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                          placeholder="예: My Custom MCP Server"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server-command">실행 명령어</Label>
                        <Input
                          id="server-command"
                          value={newServer.command}
                          onChange={(e) => setNewServer({...newServer, command: e.target.value})}
                          placeholder="예: npx, node, python"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server-args">인수 (공백으로 구분)</Label>
                        <Input
                          id="server-args"
                          value={newServer.args}
                          onChange={(e) => setNewServer({...newServer, args: e.target.value})}
                          placeholder="예: @modelcontextprotocol/server-filesystem /path/to/directory"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server-env">환경 변수 (JSON 형식)</Label>
                        <Textarea
                          id="server-env"
                          value={newServer.env}
                          onChange={(e) => setNewServer({...newServer, env: e.target.value})}
                          placeholder='{"API_KEY": "your-key", "DEBUG": "true"}'
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server-description">설명</Label>
                        <Textarea
                          id="server-description"
                          value={newServer.description}
                          onChange={(e) => setNewServer({...newServer, description: e.target.value})}
                          placeholder="서버에 대한 설명을 입력하세요"
                          rows={2}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        취소
                      </Button>
                      <Button onClick={handleAddServer}>
                        추가
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-56">이름</TableHead>
                      <TableHead className="w-48">명령어</TableHead>
                      <TableHead className="w-32">타입</TableHead>
                      <TableHead className="w-56">마지막 시작</TableHead>
                      <TableHead className="w-38 text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mcpServers.map((server) => (
                      <TableRow key={server.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{server.name}</div>
                            {server.description && (
                              <div className="text-sm text-gray-500">{server.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {server.command} {server.args.join(" ")}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-md">
                            {server.type === "builtin" ? "내장" : "사용자 정의"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {server.lastStarted ? server.lastStarted.toLocaleString() : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-3 min-w-[180px]">
                            {server.status === "running" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStopServer(server.id)}
                                className="h-9 w-9 p-0 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 hover:text-red-700"
                                title="서버 중지"
                              >
                                <Square className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStartServer(server.id)}
                                className="h-9 w-9 p-0 border-green-300 text-green-600 hover:bg-green-50 hover:border-green-400 hover:text-green-700"
                                title="서버 시작"
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-9 w-9 p-0"
                              title="서버 설정"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="서버 삭제"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>서버 삭제</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    정말로 이 MCP 서버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>취소</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteServer(server.id)}>
                                    삭제
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="builtin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>내장 MCP 서버</CardTitle>
                <CardDescription>
                  미리 정의된 MCP 서버들을 쉽게 추가할 수 있습니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {builtinMCPs.map((mcp) => (
                    <Card key={mcp.id} className="border-dashed">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg">{mcp.name}</CardTitle>
                          <Button
                            size="sm"
                            onClick={() => addBuiltinMCP(mcp)}
                            disabled={mcpServers.some(server => server.name === mcp.name)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 mb-2">{mcp.description}</p>
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded block">
                          {mcp.command} {mcp.args.join(" ")}
                        </code>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>전역 MCP 설정</CardTitle>
                <CardDescription>
                  모든 MCP 서버에 적용되는 전역 설정을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>자동 시작</Label>
                    <p className="text-sm text-gray-600">
                      애플리케이션 시작 시 MCP 서버들을 자동으로 시작합니다.
                    </p>
                  </div>
                  <Switch />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="timeout">연결 타임아웃 (초)</Label>
                  <Input id="timeout" type="number" defaultValue="30" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="retry-count">재시도 횟수</Label>
                  <Input id="retry-count" type="number" defaultValue="3" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="log-level">로그 레벨</Label>
                  <Select defaultValue="info">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debug">Debug</SelectItem>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warn">Warning</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>보안 설정</CardTitle>
                <CardDescription>
                  MCP 서버의 보안 관련 설정을 관리합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>샌드박스 모드</Label>
                    <p className="text-sm text-gray-600">
                      MCP 서버를 격리된 환경에서 실행합니다.
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>네트워크 액세스 제한</Label>
                    <p className="text-sm text-gray-600">
                      MCP 서버의 외부 네트워크 접근을 제한합니다.
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowed-hosts">허용된 호스트 (줄바꿈으로 구분)</Label>
                  <Textarea
                    id="allowed-hosts"
                    placeholder="github.com&#10;api.openai.com&#10;localhost"
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            모든 서버 재시작
          </Button>
          <Button className="bg-black text-white hover:bg-gray-800">
            설정 저장
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
} 