"use client";

import { useState, useEffect } from "react";
import { Database, GitBranch, Loader2, Plus, Trash2 } from "lucide-react";
import { useIntegrationApp } from "@integration-app/react";
import { useAuth, getAuthHeaders } from "@/app/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import useSWR from "swr";
import { DEFAULT_SUBMISSION_FIELDS, DEFAULT_DEAL_FIELDS } from "@/lib/default-fields";

interface AppField {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "boolean" | "email" | "phone";
  required?: boolean;
  description?: string;
  isCustom?: boolean;
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Failed to fetch" }));
    throw new Error(error.error || "Failed to fetch");
  }
  return response.json();
};

interface FormDefinition {
  _id: string;
  formId: string;
  formTitle: string;
  type: "default" | "custom";
  integrationKey?: string;
  createdAt: string;
  updatedAt: string;
}

export default function FieldsPage() {
  const integrationApp = useIntegrationApp();
  const { customerId } = useAuth();
  const [selectedFieldType, setSelectedFieldType] = useState<string>("");
  const [configuring, setConfiguring] = useState<
    "dataSource" | "fieldMapping" | null
  >(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newField, setNewField] = useState<Partial<AppField>>({
    key: "",
    label: "",
    type: "string",
    required: false,
    isCustom: true,
  });
  const [initializingDefaults, setInitializingDefaults] = useState(false);
  const [showAllDefaultFields, setShowAllDefaultFields] = useState(false);
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(true);

  // Fetch forms from MongoDB
  useEffect(() => {
    const fetchForms = async () => {
      if (!customerId) return;

      try {
        setIsLoadingForms(true);
        const response = await fetch(`/api/forms?customerId=${customerId}`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch forms");
        }

        const data = await response.json();
        if (data.forms) {
          setForms(data.forms);
        }
      } catch (error) {
        console.error("Error fetching forms:", error);
        setForms([]);
      } finally {
        setIsLoadingForms(false);
      }
    };

    fetchForms();
  }, [customerId]);

  const { data: schemaData, error: schemaError, isLoading, mutate: mutateFields } = useSWR<{
    type: string;
    properties: Record<string, {
      type: string;
      title?: string;
      format?: string;
      enum?: string[];
      default?: string;
      properties?: Record<string, {
        type: string;
        title: string;
        format?: string;
        enum?: string[];
        default?: string;
      }>;
    }>;
    required: string[];
  }>(selectedFieldType ? `/api/fields?fieldType=${selectedFieldType}` : null, fetcher);

  // Transform Membrane schema format to AppField format for UI
  const transformSchemaToFields = (schema: typeof schemaData): AppField[] => {
    if (!schema || !schema.properties || typeof schema.properties !== 'object') {
      return [];
    }

    const fields: AppField[] = [];
    const properties = schema.properties;
    const requiredFields = schema.required || [];
    
    // Get default field keys for the selected field type
    const defaultFieldsForType: string[] = [];
    if (selectedFieldType === 'submissions') {
      defaultFieldsForType.push(...DEFAULT_SUBMISSION_FIELDS.map(f => f.key));
    } else if (selectedFieldType === 'deals') {
      defaultFieldsForType.push(...DEFAULT_DEAL_FIELDS.map(f => f.key));
    }

    try {
      Object.entries(properties).forEach(([key, prop]) => {
        if (!prop || typeof prop !== 'object') return;

        // Skip the 'custom' object itself - we'll process its properties separately
        if (key === 'custom' && prop.type === 'object' && prop.properties) {
          // Process custom fields
          Object.entries(prop.properties).forEach(([customKey, customProp]: [string, any]) => {
            if (!customProp || typeof customProp !== 'object') return;

            let fieldType: AppField['type'] = 'string';
            if (customProp.type === 'number') {
              fieldType = 'number';
            } else if (customProp.type === 'boolean') {
              fieldType = 'boolean';
            } else if (customProp.format === 'email') {
              fieldType = 'email';
            } else if (customProp.format === 'phone') {
              fieldType = 'phone';
            } else if (customProp.format === 'date') {
              fieldType = 'date';
            }

            fields.push({
              key: customKey,
              label: customProp.title || customKey,
              type: fieldType,
              required: requiredFields.includes(customKey),
              description: undefined,
              isCustom: true,
            });
          });
          return;
        }

        // Process default fields
        let fieldType: AppField['type'] = 'string';
        if (prop.type === 'number') {
          fieldType = 'number';
        } else if (prop.type === 'boolean') {
          fieldType = 'boolean';
        } else if (prop.format === 'email') {
          fieldType = 'email';
        } else if (prop.format === 'phone') {
          fieldType = 'phone';
        } else if (prop.format === 'date') {
          fieldType = 'date';
        }

        // Determine if field is custom by checking if it's in default fields
        const isCustom = !defaultFieldsForType.includes(key);

        fields.push({
          key,
          label: prop.title || key,
          type: fieldType,
          required: requiredFields.includes(key),
          description: undefined,
          isCustom,
        });
      });
    } catch (error) {
      console.error('Error transforming schema to fields:', error);
      return [];
    }

    return fields;
  };

  const fields = transformSchemaToFields(schemaData);
  const hasProperties = schemaData?.properties && typeof schemaData.properties === 'object' && Object.keys(schemaData.properties).length > 0;

  // Separate default and custom fields
  const defaultFields = fields.filter((f) => !f.isCustom);
  const customFields = fields.filter((f) => f.isCustom);

  // When field type changes and data is loaded, auto-initialize if needed
  useEffect(() => {
    if (!selectedFieldType || isLoading || schemaError) return;

    // Check if schema has properties (Membrane format)
    const hasDefaultFields = schemaData?.properties && Object.keys(schemaData.properties).length > 0;

    // If no default fields exist, automatically initialize them
    if (!hasDefaultFields && !initializingDefaults) {
      setInitializingDefaults(true);
      fetch("/api/fields", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          initializeDefaults: true,
          fieldType: selectedFieldType,
        }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((error) => {
              throw new Error(error.error || "Failed to initialize default fields");
            });
          }
          // Refresh the fields list
          mutateFields();
        })
        .catch((error) => {
          console.error("Error auto-initializing default fields:", error);
        })
        .finally(() => {
          setInitializingDefaults(false);
        });
    }
  }, [selectedFieldType, schemaData, isLoading, schemaError, initializingDefaults, mutateFields]);


  const handleAddField = async () => {
    if (!newField.key || !newField.label) {
      alert("Please fill in key and label");
      return;
    }

    if (!selectedFieldType) {
      alert("Please select a field type first");
      return;
    }

    try {
      const response = await fetch("/api/fields", {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newField,
          fieldType: selectedFieldType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add field");
      }

      mutateFields();
      setShowAddField(false);
      setNewField({ key: "", label: "", type: "string", required: false, isCustom: true });
    } catch (error) {
      console.error("Error adding field:", error);
      alert(error instanceof Error ? error.message : "Failed to add field");
    }
  };

  const handleDeleteField = async (fieldKey: string) => {
    if (!confirm("Are you sure you want to delete this field?")) return;

    if (!selectedFieldType) {
      alert("Please select a field type first");
      return;
    }

    try {
      const response = await fetch(`/api/fields/${fieldKey}?fieldType=${selectedFieldType}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete field");
      }

      mutateFields();
    } catch (error) {
      console.error("Error deleting field:", error);
      alert(error instanceof Error ? error.message : "Failed to delete field");
    }
  };

  const handleConfigureDataSource = async () => {
    try {
      setConfiguring("dataSource");

      const connectionsResponse = await integrationApp.connections.find();
      const firstConnection = connectionsResponse.items?.[0];

      if (!firstConnection) {
        alert("No connections found. Please set up a connection first.");
        return;
      }

      const dataSourceName = selectedFieldType || "submissions";

      await integrationApp
        .connection(firstConnection.id)
        .dataSource(dataSourceName)
        .openConfiguration();
    } catch (error) {
      console.error("Error configuring data source:", error);
      alert("Failed to configure data source");
    } finally {
      setConfiguring(null);
    }
  };

  const handleConfigureFieldMapping = async () => {
    try {
      setConfiguring("fieldMapping");

      const connectionsResponse = await integrationApp.connections.find();
      const firstConnection = connectionsResponse.items?.[0];

      if (!firstConnection) {
        alert("No connections found. Please set up a connection first.");
        return;
      }

      const dataSourceName = selectedFieldType || "submissions";

      await integrationApp
        .connection(firstConnection.id)
        .fieldMapping(dataSourceName)
        .setup();

      await integrationApp
        .connection(firstConnection.id)
        .fieldMapping(dataSourceName)
        .openConfiguration();
    } catch (error) {
      console.error("Error configuring field mapping:", error);
      alert("Failed to configure field mapping");
    } finally {
      setConfiguring(null);
    }
  };

  const renderField = (field: AppField) => (
    <div
      key={field.key}
      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900 dark:text-white">
            {field.label}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({field.key})
          </span>
          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded">
            {field.type}
          </span>
          {field.required && (
            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
              Required
            </span>
          )}
        </div>
        {field.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {field.description}
          </p>
        )}
      </div>
      {/* Only show delete button for custom fields */}
      {field.isCustom && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDeleteField(field.key)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fields</h1>
        <p className="text-muted-foreground mt-2">
          Define your app fields and map them to CRM fields
        </p>
      </div>

      {/* Field Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <Label htmlFor="fieldType">Select Field Type</Label>
          <Select
            id="fieldType"
            value={selectedFieldType}
            onChange={(e) => setSelectedFieldType(e.target.value)}
            className="mt-1"
            disabled={isLoadingForms}
          >
            <option value="">Select field type...</option>
            {forms
              .filter((form) => form.type === "default")
              .map((form) => (
                <option key={form.formId} value={form.formId}>
                  {form.formTitle}
                </option>
              ))}
          </Select>
          {isLoadingForms && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Loading field types...
            </p>
          )}
        </div>
      </div>

      {selectedFieldType && (
        <>
          {/* Field Management Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Default Fields</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Pre-defined fields for {selectedFieldType}
                </p>
              </div>
              {initializingDefaults && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Initializing default fields...
                </div>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                <p>Loading fields...</p>
              </div>
            ) : schemaError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                <p>Error loading fields: {schemaError.message}</p>
              </div>
            ) : !hasProperties && !initializingDefaults ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No fields found. Fields will be initialized automatically...</p>
              </div>
            ) : defaultFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No default fields available.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {(showAllDefaultFields ? defaultFields : defaultFields.slice(0, 4)).map(renderField)}
                </div>
                {defaultFields.length > 4 && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setShowAllDefaultFields(!showAllDefaultFields)}
                      className="w-full"
                    >
                      {showAllDefaultFields ? (
                        "Show Less"
                      ) : (
                        `Show More (${defaultFields.length - 4} more)`
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Custom Fields Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Custom Fields</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add custom fields under the custom object
                </p>
              </div>
              <Button onClick={() => setShowAddField(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>

            {customFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No custom fields defined yet. Add your first custom field.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customFields.map(renderField)}
              </div>
            )}
          </div>

          {/* Integration Configuration Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">CRM Integration</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Configure data source and field mappings to sync your app fields with
              your CRM
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleConfigureDataSource}
                disabled={configuring === "dataSource"}
                variant="outline"
              >
                {configuring === "dataSource" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Configure Data Source
                  </>
                )}
              </Button>
              <Button
                onClick={handleConfigureFieldMapping}
                disabled={configuring === "fieldMapping"}
                variant="outline"
              >
                {configuring === "fieldMapping" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Configuring...
                  </>
                ) : (
                  <>
                    <GitBranch className="h-4 w-4 mr-2" />
                    Configure Field Mapping
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Add Field Dialog */}
      <Dialog open={showAddField} onOpenChange={setShowAddField}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Field</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="fieldKey">Field Key</Label>
              <Input
                id="fieldKey"
                value={newField.key}
                onChange={(e) =>
                  setNewField({ ...newField, key: e.target.value })
                }
                placeholder="e.g., custom_field_name"
                className="mt-1"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Unique identifier for the field (lowercase, underscores)
              </p>
            </div>
            <div>
              <Label htmlFor="fieldLabel">Field Label</Label>
              <Input
                id="fieldLabel"
                value={newField.label}
                onChange={(e) =>
                  setNewField({ ...newField, label: e.target.value })
                }
                placeholder="e.g., Custom Field Name"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="fieldType">Field Type</Label>
              <Select
                id="fieldType"
                value={newField.type}
                onChange={(e) =>
                  setNewField({
                    ...newField,
                    type: e.target.value as AppField["type"],
                  })
                }
                className="mt-1"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="fieldDescription">Description (Optional)</Label>
              <Input
                id="fieldDescription"
                value={newField.description || ""}
                onChange={(e) =>
                  setNewField({ ...newField, description: e.target.value })
                }
                placeholder="Field description"
                className="mt-1"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="fieldRequired"
                checked={newField.required || false}
                onChange={(e) =>
                  setNewField({ ...newField, required: e.target.checked })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="fieldRequired">Required field</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddField(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddField}>Add Field</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
