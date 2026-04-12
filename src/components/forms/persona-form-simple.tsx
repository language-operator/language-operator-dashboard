'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect } from 'react'

// Form data type matching the LanguagePersona CRD spec exactly
export type PersonaFormData = {
  name: string
  tone?: string
  personality?: string
  expertise?: string
}

// Validation schema for persona form
const personaSchema = z.object({
  name: z.string().min(1, 'Name is required').regex(/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/, 'Name must be lowercase alphanumeric with hyphens'),
  tone: z.string().optional(),
  personality: z.string().optional(),
  expertise: z.string().optional(),
})

export interface PersonaFormProps {
  initialData?: Partial<PersonaFormData>
  onSubmit: (data: PersonaFormData) => Promise<void>
  onCancel: () => void
  submitLabel?: string
  isEdit?: boolean
  clusterName?: string
}

export function PersonaFormSimple({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Create Persona',
  isEdit = false,
}: PersonaFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PersonaFormData>({
    resolver: zodResolver(personaSchema),
    defaultValues: {
      name: initialData?.name || '',
      tone: initialData?.tone || '',
      personality: initialData?.personality || '',
      expertise: initialData?.expertise || '',
    },
  })

  // Update form when initialData changes (e.g., from AI generation)
  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        tone: initialData.tone || '',
        personality: initialData.personality || '',
        expertise: initialData.expertise || '',
      })
    }
  }, [initialData, reset])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Persona</CardTitle>
          <CardDescription>Configure the persona&apos;s identity and communication style</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="technical-architect"
              disabled={isEdit}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
            {isEdit && <p className="text-sm text-muted-foreground">Name cannot be changed after creation</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Input
              id="tone"
              {...register('tone')}
              placeholder="professional, concise and direct"
            />
            {errors.tone && <p className="text-sm text-red-500">{errors.tone.message}</p>}
            <p className="text-sm text-muted-foreground">Communication style, e.g. &quot;professional&quot;, &quot;concise and direct&quot;</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="personality">Personality</Label>
            <Textarea
              id="personality"
              {...register('personality')}
              placeholder="Curious and methodical, asks clarifying questions before diving into solutions..."
              rows={4}
            />
            {errors.personality && <p className="text-sm text-red-500">{errors.personality.message}</p>}
            <p className="text-sm text-muted-foreground">Character and behavioural traits</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expertise">Expertise</Label>
            <Textarea
              id="expertise"
              {...register('expertise')}
              placeholder="Senior Go engineer with deep experience in distributed systems and Kubernetes operators..."
              rows={4}
            />
            {errors.expertise && <p className="text-sm text-red-500">{errors.expertise.message}</p>}
            <p className="text-sm text-muted-foreground">Domain knowledge and skills</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
