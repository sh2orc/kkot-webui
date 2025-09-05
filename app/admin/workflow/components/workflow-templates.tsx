"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  MessageSquare, 
  Search, 
  Globe, 
  Mail, 
  Database,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { WorkflowDefinition } from '@/lib/workflow/types'

interface WorkflowTemplatesProps {
  onSelectTemplate: (template: WorkflowDefinition) => void
}

interface TemplateCategory {
  name: string
  description: string
  templates: {
    id: string
    name: string
    description: string
    icon: any
    tags: string[]
    difficulty: 'easy' | 'medium' | 'hard'
  }[]
}

const templateCategories: TemplateCategory[] = [
  {
    name: "콘텐츠 생성",
    description: "AI를 활용한 다양한 콘텐츠 생성 워크플로우",
    templates: [
      {
        id: 'blog-post-generator',
        name: 'AI 블로그 포스트 생성기',
        description: 'RAG 검색과 LLM을 활용하여 SEO 최적화된 블로그 포스트를 자동으로 생성합니다.',
        icon: FileText,
        tags: ['콘텐츠', 'SEO', 'RAG'],
        difficulty: 'medium'
      },
      {
        id: 'social-media-content',
        name: '소셜 미디어 콘텐츠 생성',
        description: '브랜드 가이드라인에 맞춰 여러 플랫폼용 소셜 미디어 게시물을 생성합니다.',
        icon: MessageSquare,
        tags: ['소셜미디어', '마케팅'],
        difficulty: 'easy'
      },
      {
        id: 'newsletter-creator',
        name: '뉴스레터 자동 작성',
        description: '최신 뉴스와 업데이트를 수집하여 맞춤형 뉴스레터를 생성합니다.',
        icon: Mail,
        tags: ['이메일', '자동화'],
        difficulty: 'medium'
      }
    ]
  },
  {
    name: "데이터 처리",
    description: "데이터 수집, 분석 및 처리 워크플로우",
    templates: [
      {
        id: 'web-scraper-analyzer',
        name: '웹 데이터 수집 및 분석',
        description: '웹사이트에서 데이터를 수집하고 AI로 인사이트를 추출합니다.',
        icon: Globe,
        tags: ['웹스크래핑', '분석'],
        difficulty: 'hard'
      },
      {
        id: 'document-processor',
        name: '문서 일괄 처리',
        description: '여러 문서를 업로드하고 요약, 번역, 분석을 수행합니다.',
        icon: Database,
        tags: ['문서처리', 'OCR'],
        difficulty: 'medium'
      },
      {
        id: 'research-assistant',
        name: '리서치 어시스턴트',
        description: '주제에 대한 심층 연구를 수행하고 종합 보고서를 생성합니다.',
        icon: Search,
        tags: ['연구', '보고서'],
        difficulty: 'hard'
      }
    ]
  },
  {
    name: "고객 서비스",
    description: "고객 지원 및 커뮤니케이션 자동화",
    templates: [
      {
        id: 'customer-support-bot',
        name: '지능형 고객 지원',
        description: 'RAG를 활용한 고객 문의 자동 응답 시스템입니다.',
        icon: MessageSquare,
        tags: ['고객지원', '챗봇'],
        difficulty: 'medium'
      },
      {
        id: 'ticket-classifier',
        name: '티켓 분류 및 라우팅',
        description: '고객 문의를 자동으로 분류하고 적절한 팀으로 전달합니다.',
        icon: Sparkles,
        tags: ['분류', '자동화'],
        difficulty: 'easy'
      }
    ]
  }
]

const difficultyColors = {
  easy: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  hard: 'bg-red-100 text-red-800'
}

const difficultyLabels = {
  easy: '초급',
  medium: '중급',
  hard: '고급'
}

export default function WorkflowTemplates({ onSelectTemplate }: WorkflowTemplatesProps) {
  const handleUseTemplate = (templateId: string) => {
    // TODO: Load actual template data
    const mockTemplate: WorkflowDefinition = {
      id: '',
      workflowId: `template_${templateId}_${Date.now()}`,
      name: '새 워크플로우',
      description: '템플릿에서 생성됨',
      version: 1,
      isPublished: false,
      nodes: [],
      edges: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    onSelectTemplate(mockTemplate)
  }

  return (
    <div className="space-y-8">
      {templateCategories.map((category) => (
        <div key={category.name}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold">{category.name}</h3>
            <p className="text-sm text-muted-foreground">{category.description}</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {category.templates.map((template) => {
              const Icon = template.icon
              return (
                <Card key={template.id} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Icon className="h-8 w-8 text-primary" />
                      <Badge 
                        variant="secondary" 
                        className={difficultyColors[template.difficulty]}
                      >
                        {difficultyLabels[template.difficulty]}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription className="text-sm">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-1">
                        {template.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <Button 
                        className="w-full" 
                        onClick={() => handleUseTemplate(template.id)}
                      >
                        템플릿 사용
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
