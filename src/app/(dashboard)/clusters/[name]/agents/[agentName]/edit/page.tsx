'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Save } from 'lucide-react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useAgent, useUpdateAgent } from '@/hooks/use-agents'
import { useModels } from '@/hooks/use-models'
import { useTools } from '@/hooks/use-tools'
import { usePersonas } from '@/hooks/use-personas'
import { LanguageAgentFormData, LanguageAgent } from '@/types/agent'
import { LanguageModel } from '@/types/model'
import { LanguageTool } from '@/types/tool'
import { LanguagePersona } from '@/types/persona'
import { useToast } from '@/hooks/use-toast'
import { kubernetesNameValidation } from '@/lib/validation'

const agentFormSchema = z.object({
  instructions: z.string()
    .min(1, 'Goal is required')
    .min(10, 'Goal must be at least 10 characters')
    .max(5000, 'Goal must be less than 5000 characters'),
  name: kubernetesNameValidation,
  selectedModels: z.array(z.string()).min(1, 'At least one model must be selected'),
  selectedTools: z.array(z.string()),
  selectedPersona: z.string().optional(),
  runtime: z.string().optional(),
  workspaceRetain: z.boolean().optional(),
  selfConfigureEnabled: z.boolean().optional(),
  selfConfigureActions: z.array(z.enum(['tools', 'models', 'envVars', 'instructions', 'roleRules'])).optional(),
})

type AgentFormValues = z.infer<typeof agentFormSchema>


export default function EditClusterAgentPage() {
  const router = useRouter()
  const params = useParams()
  const clusterName = params?.name as string
  const agentName = params?.agentName as string
  
  const { toast } = useToast()

  const { data: agentResponse, isLoading: isLoadingAgent } = useAgent(agentName, clusterName)
  const updateAgent = useUpdateAgent(clusterName)
  const agent = agentResponse?.data

  // Fetch available data for dropdowns
  const { data: modelsResponse, isLoading: isLoadingModels } = useModels({ clusterName })
  const { data: toolsResponse, isLoading: isLoadingTools } = useTools({ clusterName })
  const { data: personasResponse, isLoading: isLoadingPersonas } = usePersonas({ clusterName })
  
  // Extract data from API responses
  const availableModels: LanguageModel[] = modelsResponse?.data || []
  const availableTools: LanguageTool[] = toolsResponse?.data || []
  const availablePersonas: LanguagePersona[] = personasResponse?.data || []
  
  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      instructions: '',
      name: '',
      selectedModels: [],
      selectedTools: [],
      selectedPersona: 'none',
      runtime: '',
      workspaceRetain: false,
      selfConfigureEnabled: false,
      selfConfigureActions: [],
    },
  })

  // Populate form when agent data is loaded
  useEffect(() => {
    if (agent) {
      form.reset({
        instructions: agent.spec.instructions || '',
        name: agent.metadata.name,
        selectedModels: agent.spec.models?.map((m: { name: string }) => m.name) || [],
        selectedTools: agent.spec.tools?.map((t: { name: string }) => t.name) || [],
        selectedPersona: agent.spec.persona || 'none',
        runtime: agent.spec.runtime || '',
        workspaceRetain: agent.spec.workspace?.retain || false,
        selfConfigureEnabled: agent.spec.selfConfigure?.enabled || false,
        selfConfigureActions: agent.spec.selfConfigure?.allowedActions || [],
      })
    }
  }, [agent, form])

  const onSubmit = async (values: AgentFormValues) => {
    try {
      const formData: LanguageAgentFormData = {
        instructions: values.instructions,
        name: values.name,
        namespace: agent?.metadata.namespace || '',
        selectedModels: values.selectedModels,
        selectedTools: values.selectedTools,
        selectedPersona: values.selectedPersona === 'none' ? undefined : values.selectedPersona,
        runtime: values.runtime || undefined,
        workspaceRetain: values.workspaceRetain || undefined,
        selfConfigure: values.selfConfigureEnabled
          ? { enabled: true, allowedActions: values.selfConfigureActions ?? [] }
          : undefined,
      }

      await updateAgent.mutateAsync({ name: agentName, agent: formData as Partial<LanguageAgent> })
      
      toast({
        title: 'Agent updated successfully',
        description: `Agent "${values.name}" has been updated.`,
      })
      
      // Redirect to agent detail page
      router.push(`/clusters/${clusterName}/agents/${agentName}`)
    } catch (error) {
      console.error('Failed to update agent:', error)
      toast({
        title: 'Failed to update agent',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      })
    }
  }


  const handleCancel = () => {
    router.push(`/clusters/${clusterName}/agents/${agentName}`)
  }

  if (isLoadingAgent) {
    return (
      <div className="space-y-6">
        <div className="h-96 bg-stone-200 dark:bg-stone-700 animate-pulse"></div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-stone-600 dark:text-stone-400">Agent not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {/* Main Form */}
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Agent Configuration</CardTitle>
                      <CardDescription>
                        Define your language agent with instructions, models, tools, and persona
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Instructions - Primary field */}
                      <FormField
                        control={form.control}
                        name="instructions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Enter the goal for your agent (e.g., 'Write a short story', 'Analyze customer feedback', 'Generate test cases')..."
                                className="min-h-[120px] text-base"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              The specific goal or task you want this agent to accomplish
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Agent Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Agent Name *</FormLabel>
                            <FormControl>
                              <Input {...field} disabled />
                            </FormControl>
                            <FormDescription>
                              Name cannot be changed after creation
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Models Multi-select */}
                      <FormField
                        control={form.control}
                        name="selectedModels"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Models *</FormLabel>
                            <FormDescription>
                              Select one or more models for your agent
                            </FormDescription>
                            {isLoadingModels ? (
                              <div className="text-sm text-stone-600 dark:text-stone-400">Loading available models...</div>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 mt-2">
                                {availableModels.map((model) => (
                                  <div key={model.metadata.name} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={field.value.includes(model.metadata.name!)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, model.metadata.name!])
                                        } else {
                                          field.onChange(field.value.filter(name => name !== model.metadata.name!))
                                        }
                                      }}
                                    />
                                    <div className="flex-1">
                                      <div className="font-light">{model.metadata.name}</div>
                                      <div className="text-sm text-stone-600 dark:text-stone-400">{model.spec.provider} - {model.spec.modelName}</div>
                                    </div>
                                  </div>
                                ))}
                                {availableModels.length === 0 && (
                                  <div className="text-sm text-stone-600 dark:text-stone-400">No models available in this cluster</div>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Tools Multi-select */}
                      <FormField
                        control={form.control}
                        name="selectedTools"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tools</FormLabel>
                            <FormDescription>
                              Select tools and capabilities for your agent
                            </FormDescription>
                            {isLoadingTools ? (
                              <div className="text-sm text-stone-600 dark:text-stone-400">Loading available tools...</div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {availableTools.map((tool) => (
                                  <div key={tool.metadata.name} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={field.value.includes(tool.metadata.name!)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...field.value, tool.metadata.name!])
                                        } else {
                                          field.onChange(field.value.filter(name => name !== tool.metadata.name!))
                                        }
                                      }}
                                    />
                                    <div className="flex-1">
                                      <div className="font-light">{tool.metadata.name}</div>
                                    </div>
                                  </div>
                                ))}
                                {availableTools.length === 0 && (
                                  <div className="text-sm text-stone-600 dark:text-stone-400">No tools available in this cluster</div>
                                )}
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Persona Single Select */}
                      <FormField
                        control={form.control}
                        name="selectedPersona"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Persona</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {isLoadingPersonas ? (
                                  <SelectItem value="loading" disabled>Loading personas...</SelectItem>
                                ) : (
                                  availablePersonas.map((persona) => (
                                    <SelectItem key={persona.metadata.name} value={persona.metadata.name!}>
                                      {persona.metadata.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Runtime */}
                      <FormField
                        control={form.control}
                        name="runtime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Runtime</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. opencode" {...field} />
                            </FormControl>
                            <FormDescription>
                              Name of a LanguageAgentRuntime preset (optional). Provides default image, ports, and probes.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Workspace Retain */}
                      <FormField
                        control={form.control}
                        name="workspaceRetain"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div>
                              <FormLabel>Retain workspace PVC on deletion</FormLabel>
                              <FormDescription>
                                Prevents the persistent volume claim from being deleted when the agent is removed
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Self-Configure */}
                      <FormField
                        control={form.control}
                        name="selfConfigureEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div>
                              <FormLabel>Allow self-configuration</FormLabel>
                              <FormDescription>
                                Permit the agent to modify its own configuration at runtime
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {form.watch('selfConfigureEnabled') && (
                        <FormField
                          control={form.control}
                          name="selfConfigureActions"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Allowed self-configure actions</FormLabel>
                              <FormDescription>
                                Which aspects of its configuration the agent may change
                              </FormDescription>
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                {(['tools', 'models', 'envVars', 'instructions', 'roleRules'] as const).map((action) => (
                                  <div key={action} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={(field.value ?? []).includes(action)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value ?? []
                                        if (checked) {
                                          field.onChange([...current, action])
                                        } else {
                                          field.onChange(current.filter((a) => a !== action))
                                        }
                                      }}
                                    />
                                    <span className="text-sm font-light">{action}</span>
                                  </div>
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </CardContent>
                  </Card>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                
                <Button 
                  type="submit" 
                  disabled={updateAgent.isPending}
                  className="ml-auto"
                >
                  {updateAgent.isPending ? (
                    <>Updating...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Agent
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

      </div>
    </div>
  )
}