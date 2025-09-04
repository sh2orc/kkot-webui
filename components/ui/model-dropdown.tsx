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
  const [search, setSearch] = useState("")
  const { lang } = useTranslation("chat")
  
  // Reset search when dropdown opens
  useEffect(() => {
    if (open) {
      setSearch(""); // Reset search when opening
    }
  }, [open])
  
  // Filter models based on search
  const filteredModels = publicModels.filter(model => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return model.modelId.toLowerCase().includes(searchLower) ||
           (model.provider || '').toLowerCase().includes(searchLower) ||
           (model.serverName || '').toLowerCase().includes(searchLower);
  });
  
  const filteredAgents = agents.filter(agent => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return agent.name.toLowerCase().includes(searchLower) ||
           agent.agentId.toLowerCase().includes(searchLower);
  });

  // Function to get provider-specific icon text
  const getFallbackText = (model: ModelOrAgent | null) => {
    if (!model) return 'AI'
    
    if (model.type === 'agent') {
      const agent = model as Agent
      return (agent.name || '').charAt(0).toUpperCase() || 'A'
    } else {
      const publicModel = model as PublicModel
      const provider = (publicModel.provider || '').toLowerCase()
      
      // Provider-specific icons
      if (provider.includes('openai')) return 'O'
      if (provider.includes('google') || provider.includes('gemini')) return 'G'
      if (provider.includes('anthropic') || provider.includes('claude')) return 'C'
      if (provider.includes('ollama')) return 'L'
      if (provider.includes('azure')) return 'A'
      if (provider.includes('cohere')) return 'C'
      
      // Fallback to first letter of provider or server name
      return (publicModel.serverName || publicModel.provider || '').charAt(0).toUpperCase() || 'M'
    }
  }

  // Function to determine background color
  const getAvatarBackground = (model: ModelOrAgent | null) => {
    if (!model) return 'bg-red-500'
    
    switch(model.type) {
      case 'agent':
        return 'bg-green-500'
      case 'model':
        const provider = (model as PublicModel).provider?.toLowerCase() || ''
        if (provider.includes('openai')) return 'bg-blue-500'
        if (provider.includes('google') || provider.includes('gemini')) return 'bg-amber-500'
        if (provider.includes('anthropic') || provider.includes('claude')) return 'bg-orange-500'
        if (provider.includes('ollama')) return 'bg-slate-500'
        if (provider.includes('azure')) return 'bg-cyan-500'
        if (provider.includes('cohere')) return 'bg-purple-500'
        return 'bg-gray-500'
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
              <Avatar 
                key={`${selectedModel.id}-${selectedModel.type}`}
                className="h-6 w-6 flex-shrink-0"
              >
                {selectedModel.type === 'agent' && (selectedModel as Agent).imageData ? (
                  <AvatarImage 
                    src={(selectedModel as Agent).imageData} 
                    alt={(selectedModel as Agent).name || ''} 
                  />
                ) : null}
                <AvatarFallback 
                  delayMs={0}
                  className={`${getAvatarBackground(selectedModel)} text-white text-xs font-medium rounded-full`}
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    lineHeight: '1',
                    height: '100%',
                    width: '100%'
                  }}
                >
                  {getFallbackText(selectedModel)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{renderSelectedModelText()}</span>
            </div>
          )}
          {!selectedModel && <span>{lang("selectModel")}</span>}
          <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={lang("searchModels")} 
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{lang("noResults")}</CommandEmpty>
            
            {isLoading && (
              <div className="py-4 text-center text-sm text-muted-foreground">
                {lang("loadingAgents")}
              </div>
            )}

            {/* Agent group */}
            {filteredAgents.length > 0 && (
              <CommandGroup heading={lang("agents")}>
                {filteredAgents.map((agent) => (
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
                      <AvatarFallback 
                        className={`${getAvatarBackground(agent)} text-white text-xs font-medium rounded-full`}
                        style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          lineHeight: '1',
                          height: '100%',
                          width: '100%'
                        }}
                      >
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
            {filteredModels.length > 0 && (
              <>
                {filteredAgents.length > 0 && <CommandSeparator />}
                <CommandGroup heading={lang("publicModels")}>
                  {filteredModels.map((model) => {
                    // Ensure provider is always defined for CommandItem value
                    const safeProvider = model.provider || 'unknown';
                    const searchValue = `${model.modelId} ${safeProvider} ${model.serverName || ''}`.toLowerCase();
                    
                    return (
                    <CommandItem
                      key={model.id}
                      value={searchValue}
                      onSelect={() => {
                        setSelectedModel(model)
                        setOpen(false)
                      }}
                      className="flex items-center gap-2"
                    >
                      <Avatar className="h-6 w-6 flex-shrink-0">
                        <AvatarFallback 
                          className={`${getAvatarBackground(model)} text-white text-xs font-medium rounded-full`}
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            lineHeight: '1',
                            height: '100%',
                            width: '100%'
                          }}
                        >
                          {getFallbackText(model)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span>{model.modelId}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.serverName || model.provider}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedModel?.id === model.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 