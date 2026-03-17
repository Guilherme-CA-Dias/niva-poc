"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/app/auth-provider"
import { useSchema } from "@/hooks/useSchema"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Trash2, Loader2 } from "lucide-react"
import { AddFieldButton } from "./add-field-button"

interface DynamicFormProps {
  recordType: string
}

export function DynamicForm({ recordType }: DynamicFormProps) {
  const { customerId } = useAuth()
  const { schema, isLoading, error, mutate } = useSchema(recordType)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [deleting, setDeleting] = useState<string | null>(null)

  // Initialize form data with default values when schema loads
  useEffect(() => {
    if (schema) {
      const defaults: Record<string, any> = {}
      Object.entries(schema.properties).forEach(([name, field]) => {
        if (field.default) {
          defaults[name] = field.default
        }
      })
      setFormData(defaults)
    }
  }, [schema])

  const handleDeleteField = async (fieldName: string) => {
    if (!customerId || !recordType) return
    
    try {
      setDeleting(fieldName)
      const formId = recordType.replace('get-', '')
      
      const response = await fetch(`/api/schema/${formId}/${customerId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fieldName })
      })

      if (!response.ok) {
        throw new Error('Failed to delete field')
      }

      await mutate() // Refresh the schema
    } catch (error) {
      console.error('Error deleting field:', error)
    } finally {
      setDeleting(null)
    }
  }

  if (isLoading) return <div>Loading form schema...</div>
  if (error) return <div>Error loading form schema</div>
  if (!schema) return null

  const handleInputChange = (name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-semibold">Form Fields</h2>
        <AddFieldButton 
          recordType={recordType} 
          onFieldAdded={() => mutate()} 
        />
      </div>
      <div className="space-y-4 max-w-2xl">
        {Object.entries(schema.properties).map(([name, field]) => (
          <div key={name} className="flex items-start gap-4">
            <div className="flex-1 space-y-2">
              <Label>{field.title}</Label>
              {field.enum && field.enum.length > 0 ? (
                <Select
                  value={formData[name] || ''}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  disabled={deleting === name}
                >
                  <option value="">
                    Select {field.title.toLowerCase()}
                  </option>
                  {field.enum.map((option: string) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  type={field.format === 'email' ? 'email' : 'text'}
                  value={formData[name] || ''}
                  onChange={(e) => handleInputChange(name, e.target.value)}
                  disabled={deleting === name}
                />
              )}
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="mt-8"
              onClick={() => handleDeleteField(name)}
              disabled={deleting === name}
            >
              {deleting === name ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
} 
