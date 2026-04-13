'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PersonaFormSimple, PersonaFormData } from '@/components/forms/persona-form-simple'
import { usePersona, useUpdatePersona } from '@/hooks/use-personas'
import { Skeleton } from '@/components/ui/skeleton'
import { ResourceHeader } from '@/components/ui/resource-header'
import { Users } from 'lucide-react'

export default function EditClusterPersonaPage() {
  const router = useRouter()
  const params = useParams()
  const clusterName = params?.name as string
  const personaName = params?.personaName as string

  const { data: personaResponse, isLoading: isLoadingPersona, error } = usePersona(personaName, clusterName)
  const persona = personaResponse?.persona
  const updatePersona = useUpdatePersona(clusterName)

  const [submitError, setSubmitError] = useState('')
  const [initialData, setInitialData] = useState<Partial<PersonaFormData>>()

  useEffect(() => {
    if (persona) {
      setInitialData({
        name: persona.metadata.name,
        tone: persona.spec.tone || '',
        personality: persona.spec.personality || '',
        expertise: persona.spec.expertise || '',
      })
    }
  }, [persona])

  const handleSubmit = async (formData: PersonaFormData) => {
    setSubmitError('')

    try {
      const payload = {
        ...(formData.tone !== undefined && { tone: formData.tone }),
        ...(formData.personality !== undefined && { personality: formData.personality }),
        ...(formData.expertise !== undefined && { expertise: formData.expertise }),
      }

      await updatePersona.mutateAsync({
        name: personaName,
        data: payload,
      })

      router.push(`/clusters/${clusterName}/personas/${personaName}`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to update persona')
    }
  }

  const handleCancel = () => {
    router.push(`/clusters/${clusterName}/personas/${personaName}`)
  }

  if (isLoadingPersona) {
    return (
      <div className="space-y-6">
        <ResourceHeader
          backHref={`/clusters/${clusterName}/personas`}
          backLabel="Back to Personas"
          icon={Users}
          title="Loading..."
          subtitle="Loading persona details..."
        />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error || !persona) {
    return (
      <div className="space-y-6">
        <ResourceHeader
          backHref={`/clusters/${clusterName}/personas`}
          backLabel="Back to Personas"
          icon={Users}
          title="Persona Not Found"
          subtitle={`The persona "${personaName}" was not found in cluster "${clusterName}"`}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <ResourceHeader
        backHref={`/clusters/${clusterName}/personas`}
        backLabel="Back to Personas"
        icon={Users}
        title="Edit Language Persona"
        subtitle={`Edit "${persona.metadata.name}" in the ${clusterName} cluster`}
      />

      {/* Form */}
      <div className="max-w-4xl">
        {initialData ? (
          <>
            {submitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{submitError}</p>
              </div>
            )}
            <PersonaFormSimple
              initialData={initialData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
              submitLabel={updatePersona.isPending ? 'Updating...' : 'Update Persona'}
              isEdit={true}
            />
          </>
        ) : (
          <Skeleton className="h-96 w-full" />
        )}
      </div>
    </div>
  )
}
