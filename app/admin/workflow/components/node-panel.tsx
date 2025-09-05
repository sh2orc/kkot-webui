"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { NodeType } from "@/lib/workflow/types"
import {
  FileText,
  Bot,
  Search,
  Globe,
  Code,
  GitBranch,
  Repeat,
  Zap,
  Database,
  Send,
  Upload,
  Download
} from "lucide-react"

interface NodeCategory {
  name: string
  nodes: {
    type: NodeType
    label: string
    icon: any
    description: string
  }[]
}

const nodeCategories: NodeCategory[] = [
  {
    name: "입력",
    nodes: [
      {
        type: NodeType.USER_INPUT,
        label: "사용자 입력",
        icon: FileText,
        description: "사용자로부터 텍스트 입력 받기"
      },
      {
        type: NodeType.FILE_UPLOAD,
        label: "파일 업로드",
        icon: Upload,
        description: "파일 업로드 처리"
      },
      {
        type: NodeType.API_TRIGGER,
        label: "API 트리거",
        icon: Zap,
        description: "API 호출로 워크플로우 시작"
      }
    ]
  },
  {
    name: "AI 처리",
    nodes: [
      {
        type: NodeType.LLM_AGENT,
        label: "LLM 에이전트",
        icon: Bot,
        description: "AI 에이전트로 텍스트 처리"
      },
      {
        type: NodeType.RAG_SEARCH,
        label: "RAG 검색",
        icon: Search,
        description: "문서에서 관련 정보 검색"
      },
      {
        type: NodeType.DEEP_RESEARCH,
        label: "딥 리서치",
        icon: Globe,
        description: "심층 연구 수행"
      },
      {
        type: NodeType.WEB_SEARCH,
        label: "웹 검색",
        icon: Globe,
        description: "웹에서 정보 검색"
      }
    ]
  },
  {
    name: "데이터 변환",
    nodes: [
      {
        type: NodeType.TEXT_PROCESSOR,
        label: "텍스트 처리",
        icon: FileText,
        description: "텍스트 변환 및 처리"
      },
      {
        type: NodeType.JSON_PARSER,
        label: "JSON 파서",
        icon: Code,
        description: "JSON 데이터 파싱"
      },
      {
        type: NodeType.PROMPT_TEMPLATE,
        label: "프롬프트 템플릿",
        icon: FileText,
        description: "동적 프롬프트 생성"
      }
    ]
  },
  {
    name: "제어 흐름",
    nodes: [
      {
        type: NodeType.CONDITIONAL,
        label: "조건 분기",
        icon: GitBranch,
        description: "조건에 따른 분기 처리"
      },
      {
        type: NodeType.LOOP,
        label: "반복",
        icon: Repeat,
        description: "데이터 반복 처리"
      },
      {
        type: NodeType.PARALLEL,
        label: "병렬 처리",
        icon: Zap,
        description: "여러 작업 동시 실행"
      }
    ]
  },
  {
    name: "출력",
    nodes: [
      {
        type: NodeType.RESPONSE,
        label: "응답",
        icon: Send,
        description: "최종 결과 반환"
      },
      {
        type: NodeType.DATABASE_QUERY,
        label: "데이터베이스",
        icon: Database,
        description: "데이터베이스 작업"
      },
      {
        type: NodeType.WEBHOOK_SENDER,
        label: "웹훅 전송",
        icon: Download,
        description: "외부 시스템으로 데이터 전송"
      }
    ]
  }
]

export default function NodePanel() {
  const onDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('nodeType', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm">노드 라이브러리</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          {nodeCategories.map((category, categoryIndex) => (
            <div key={category.name}>
              {categoryIndex > 0 && <Separator />}
              <div className="p-4">
                <h3 className="text-xs font-semibold text-muted-foreground mb-3">
                  {category.name}
                </h3>
                <div className="space-y-2">
                  {category.nodes.map((node) => {
                    const Icon = node.icon
                    return (
                      <div
                        key={node.type}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-move hover:bg-accent transition-colors"
                        draggable
                        onDragStart={(e) => onDragStart(e, node.type)}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {node.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {node.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
