"use client"

import { useState, useEffect } from "react"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Database, GitBranch, Loader2 } from "lucide-react"
import { DynamicForm } from "./components/dynamic-form"
import { useIntegrationApp, useIntegrations } from "@integration-app/react"
import { useAuth } from '@/app/auth-provider'

interface FormDefinition {
  _id: string
  formId: string
  formTitle: string
  type: 'default' | 'custom'
  integrationKey?: string
  createdAt: string
  updatedAt: string
}

export default function FormsPage() {
  const [selectedAction, setSelectedAction] = useState('')
  const [isCreatingForm, setIsCreatingForm] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [newFormData, setNewFormData] = useState({ 
    name: '', 
    id: '', 
    integrationKey: '' 
  })
  const [forms, setForms] = useState<FormDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const integrationApp = useIntegrationApp()
  const { integrations } = useIntegrations()
  const { customerId } = useAuth()
  const [configuring, setConfiguring] = useState<'dataSource' | 'fieldMapping' | null>(null)

  // Fetch forms from MongoDB
  useEffect(() => {
    const fetchForms = async () => {
      if (!customerId) return

      try {
        setIsLoading(true)
        const response = await fetch(`/api/forms?customerId=${customerId}`)
        
        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = 'Failed to fetch forms'
          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error || errorMessage
          } catch {
            errorMessage = errorText || errorMessage
          }
          throw new Error(errorMessage)
        }

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Response is not JSON')
        }

        const text = await response.text()
        if (!text) {
          throw new Error('Empty response from server')
        }

        const data = JSON.parse(text)
        
        if (!data.forms) {
          throw new Error('Invalid response format: missing forms array')
        }

        setForms(data.forms)
        
        // Clear selected action if the form no longer exists
        if (selectedAction && !data.forms.find((f: FormDefinition) => `get-${f.formId}` === selectedAction)) {
          setSelectedAction('')
        }
      } catch (error) {
        console.error('Error fetching forms:', error)
        setForms([])
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchForms()
  }, [customerId, selectedAction])

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newFormData.integrationKey || !customerId) {
      return
    }

    try {
      setIsCreatingForm(true)
      const formId = newFormData.id.toUpperCase()

      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          formId,
          formTitle: newFormData.name,
          integrationKey: newFormData.integrationKey
        })
      })

      if (!response.ok) throw new Error('Failed to create form')

      const newForm = await response.json()
      setForms(prev => [...prev, newForm])
      setSelectedAction(`get-${formId.toLowerCase()}`)
      setNewFormData({ name: '', id: '', integrationKey: '' })
      setIsDialogOpen(false)
    } catch (error) {
      console.error('Error creating form:', error)
    } finally {
      setIsCreatingForm(false)
    }
  }

  const handleConfigureDataSource = async () => {
    console.log('handleConfigureDataSource called')
    const form = forms.find(f => f.formId === selectedAction.split('-')[1])
    console.log('Selected form:', form)
    
    if (!form) {
      console.log('No form found, returning')
      return
    }
    
    // Only require integration key for custom forms
    if (form.type === 'custom' && !form.integrationKey) {
      console.log('Custom form requires integration key, returning')
      return
    }

    const integrationKey = form.integrationKey

    try {
      setConfiguring('dataSource')
      
      const dataSourceName = form.type === 'custom' ? 'objects' : selectedAction.replace('get-', '')
      console.log('dataSourceName:', dataSourceName)
      const instanceConfig = form.type === 'custom' ? { instanceKey: form.formId } : undefined
      
      // Get the first available connection
      const connectionsResponse = await integrationApp.connections.find()
      const firstConnection = connectionsResponse.items?.[0]
      
      if (!firstConnection) {
        alert('No connections found. Please set up a connection first.')
        return
      }

      // First, open the data source configuration
      await integrationApp
        .connection(form.type === 'custom' ? form.integrationKey! : firstConnection.id)
        .dataSource(dataSourceName, instanceConfig)
        .openConfiguration()
      
      // After configuring data source, create a flow instance for receiving events
      if (form.type === 'custom' && integrationKey) {
        await integrationApp
          .connection(integrationKey)
          .flow('receive-objects-events', instanceConfig)
          .get({ autoCreate: true })

        await integrationApp
          .connection(integrationKey)
          .flow('send-object-events', instanceConfig)
          .get({ autoCreate: true })
      }
      
    } catch (error) {
      console.error("Error configuring data source or creating flow:", error)
    } finally {
      setConfiguring(null)
    }
  }

  const handleConfigureFieldMapping = async () => {
    const form = forms.find(f => f.formId === selectedAction.split('-')[1])
    if (!form) {
      console.log('No form found, returning')
      return
    }
    
    // Only require integration key for custom forms
    if (form.type === 'custom' && !form.integrationKey) {
      console.log('Custom form requires integration key, returning')
      return
    }

    const integrationKey = form.integrationKey

    try {
      setConfiguring('fieldMapping')
      const dataSourceName = form.type === 'custom' ? 'objects' : selectedAction.replace('get-', '')
      const instanceConfig = form.type === 'custom' ? { instanceKey: form.formId } : undefined
      
      // Get the first available connection
      const connectionsResponse = await integrationApp.connections.find()
      const firstConnection = connectionsResponse.items?.[0]
      
      if (!firstConnection) {
        alert('No connections found. Please set up a connection first.')
        return
      }

      await integrationApp
        .connection(form.type === 'custom' && integrationKey ? integrationKey : firstConnection.id)
        .fieldMapping(dataSourceName, instanceConfig)
        .setup()

      await integrationApp
        .connection(form.type === 'custom' && integrationKey ? integrationKey : firstConnection.id)
        .fieldMapping(dataSourceName, instanceConfig)
        .openConfiguration()
    } finally {
      setConfiguring(null)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Record types and configuration</h1>
        <p className="text-muted-foreground mt-2">
          Select a record type or create a new form or <span className="underline">set the data collection and field mapping</span>
        </p>
      </div>
      <div className="flex items-center gap-4">
        <Select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="w-full max-w-md pr-8"
          disabled={isLoading}
        >
          <option value="">Select record type</option>
          {forms.map((form) => {
            const integrationName = form.type === 'custom' 
              ? integrations.find(i => i.key === form.integrationKey)?.name 
              : null;

            return (
              <option key={form.formId} value={`get-${form.formId}`}>
                {form.formTitle} {form.type === 'custom' ? `(Custom - ${integrationName})` : ''}
              </option>
            );
          })}
        </Select>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2 bg-primary hover:bg-primary-600 transition-colors">
              <Plus className="h-4 w-4" />
              New Form
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-gray-950 border-border">
            <DialogHeader>
              <DialogTitle className="text-gray-900 dark:text-gray-100">Create New Form</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateForm} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="integration" className="text-gray-700 dark:text-gray-300">
                  Integration
                </Label>
                <Select
                  id="integration"
                  value={newFormData.integrationKey}
                  onChange={(e) => setNewFormData(prev => ({ 
                    ...prev, 
                    integrationKey: e.target.value 
                  }))}
                  className="w-full bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  required
                >
                  <option value="">Select integration</option>
                  {integrations.map((integration) => (
                    <option key={integration.key} value={integration.key}>
                      {integration.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
                  Form Name
                </Label>
                <Input
                  id="name"
                  value={newFormData.name}
                  onChange={(e) => setNewFormData(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  placeholder="e.g., Projects"
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id" className="text-gray-700 dark:text-gray-300">
                  Form ID
                </Label>
                <Input
                  id="id"
                  value={newFormData.id}
                  onChange={(e) => setNewFormData(prev => ({ 
                    ...prev, 
                    id: e.target.value 
                  }))}
                  placeholder="e.g., PROJ"
                  className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 border-gray-200 dark:border-gray-800"
                  required
                  pattern="[A-Za-z]+"
                  title="Only letters allowed"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Only letters, will be converted to uppercase
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isCreatingForm || !newFormData.integrationKey}
              >
                {isCreatingForm ? 'Creating...' : 'Create Form'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {selectedAction && (
        <div className="flex gap-4">
          <Button 
            onClick={handleConfigureDataSource}
            className="flex items-center gap-2 bg-primary hover:bg-primary-600 transition-colors"
            disabled={configuring === 'dataSource'}
          >
            {configuring === 'dataSource' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Database className="h-4 w-4" />
            )}
            Configure Data Source
          </Button>
          <Button 
            onClick={handleConfigureFieldMapping}
            className="flex items-center gap-2 bg-primary hover:bg-primary-600 transition-colors"
            disabled={configuring === 'fieldMapping'}
          >
            {configuring === 'fieldMapping' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <GitBranch className="h-4 w-4" />
            )}
            Configure Field Mapping
          </Button>
        </div>
      )}

      {selectedAction && (
        <DynamicForm recordType={selectedAction} />
      )}
    </div>
  )
} 
