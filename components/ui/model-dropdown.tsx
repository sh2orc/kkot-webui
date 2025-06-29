"use client"

import { useState, useEffect } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useModel, type ModelOrAgent, type Agent, type PublicModel } from "@/components/providers/model-provider"
import { useTranslation } from "@/lib/i18n"

export function ModelDropdown() {
  const { 
    selectedModel, 
    agents, 
    publicModels, 
    isLoading, 
    setSelectedModel 
  } = useModel()
  
  const [open, setOpen] = useState(false)
  const { lang } = useTranslation("chat")

  // Function to get first letter
  const getFallbackText = (model: ModelOrAgent | null) => {
    if (!model) return 'AI'
    
    if (model.type === 'agent') {
      const agent = model as Agent
      return (agent.name || '').charAt(0).toUpperCase() || 'A'
    } else {
      const publicModel = model as PublicModel
      return (publicModel.provider || '').charAt(0).toUpperCase() || 'M'
    }
  }

  // Function to determine background color
  const getAvatarBackground = (model: ModelOrAgent | null) => {
    if (!model) return 'bg-red-500'
    
    switch(model.type) {
      case 'agent':
        return 'bg-green-500'
      case 'model':
        if ((model as PublicModel).provider?.toLowerCase().includes('openai')) return 'bg-blue-500'
        if ((model as PublicModel).provider?.toLowerCase().includes('google')) return 'bg-yellow-500'
        if ((model as PublicModel).provider?.toLowerCase().includes('gemini')) return 'bg-teal-500'
        return 'bg-purple-500'
      default:
        return 'bg-red-500'
    }
  }

  // Display selected model text
  const renderSelectedModelText = () => {
    if (!selectedModel) return lang("selectModel")
    
    if (selectedModel.type === 'agent') {
      return (selectedModel as Agent).name
    } else {
      return (selectedModel as PublicModel).modelId
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedModel && (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {selectedModel.type === 'agent' && (selectedModel as Agent).imageData && (
                  <AvatarImage 
                    src={(selectedModel as Agent).imageData} 
                    alt={(selectedModel as Agent).name || ''} 
                  />
                )}
                <AvatarFallback className={`${getAvatarBackground(selectedModel)} text-white text-xs`}>
                  {getFallbackText(selectedModel)}
                </AvatarFallback>
              </Avatar>
              <span>{renderSelectedModelText()}</span>
            </div>
          )}
          {!selectedModel && <span>{lang("selectModel")}</span>}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder={lang("searchModels")} />
          <CommandList>
            <CommandEmpty>{lang("noResults")}</CommandEmpty>
            
            {isLoading && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {lang("loadingAgents")}
              </div>
            )}

            {/* Agent group */}
            {agents.length > 0 && (
              <CommandGroup heading={lang("agents")}>
                {agents.map((agent) => (
                  <CommandItem
                    key={agent.id}
                    value={`agent-${agent.id}-${agent.name}`}
                    onSelect={() => {
                      setSelectedModel(agent)
                      setOpen(false)
                    }}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="h-6 w-6">
                      {agent.imageData && (
                        <AvatarImage 
                          src={agent.imageData} 
                          alt={agent.name || ''} 
                        />
                      )}
                      <AvatarFallback className={`${getAvatarBackground(agent)} text-white text-xs`}>
                        {getFallbackText(agent)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span>{agent.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {agent.agentId}
                      </span>
                    </div>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedModel?.id === agent.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Model group */}
            {publicModels.length > 0 && (
              <>
                {agents.length > 0 && <CommandSeparator />}
                <CommandGroup heading={lang("publicModels")}>
                  {publicModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={`model-${model.id}-${model.modelId}-${model.provider}`}
                      onSelect={() => {
                        setSelectedModel(model)
                        setOpen(false)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className={`${getAvatarBackground(model)} text-white text-xs`}>
                          {getFallbackText(model)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{model.modelId}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.provider}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedModel?.id === model.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 