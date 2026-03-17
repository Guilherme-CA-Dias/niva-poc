"use client";

import { useState, useEffect } from "react";
import { Upload, Loader2, FileText, Search, X } from "lucide-react";
import { useAuth, getAuthHeaders } from "@/app/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import useSWR from "swr";
import { useMembrane } from "@/app/membrane-provider";
import { getFieldsForDocumentType, getDocumentTypeOptions } from "@/lib/document-types";
import type { Record as RecordType } from "@/types/record";

interface Document {
  document_type?: string;
  [key: string]: any;
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

export default function FilesPage() {
  const { getClient } = useMembrane();
  const { customerId } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string>("hubspot");
  const [savingDocumentType, setSavingDocumentType] = useState<number | null>(null);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>("");
  const [recordSearchQuery, setRecordSearchQuery] = useState<string>("");
  const [showRecordSelector, setShowRecordSelector] = useState<boolean>(false);

  // Fetch document fields schema
  const { mutate: mutateFields } = useSWR<{
    type: string;
    properties: Record<string, any>;
    required: string[];
  }>(customerId ? `/api/fields?fieldType=files` : null, fetcher);

  // Fetch records (deals) for selection
  const { data: recordsData, isLoading: isLoadingRecords } = useSWR<{
    records: RecordType[];
    cursor?: string;
  }>(
    customerId && showRecordSelector
      ? `/api/records?action=get-deals${recordSearchQuery ? `&search=${encodeURIComponent(recordSearchQuery)}` : ''}`
      : null,
    fetcher
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showRecordSelector && !target.closest('.record-selector-container')) {
        setShowRecordSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showRecordSelector]);

  // Get document type options
  const documentTypeOptions = getDocumentTypeOptions();

  // Get fields for a specific document type
  const getFieldsForDoc = (doc: Document) => {
    if (!doc.document_type) {
      return [];
    }
    return getFieldsForDocumentType(doc.document_type);
  };

  // Save document type to schema
  const saveDocumentTypeToSchema = async (documentType: string, index: number) => {
    if (!documentType || !customerId) return;

    setSavingDocumentType(index);

    try {
      const fields = getFieldsForDocumentType(documentType);
      
      // Save each field to the schema
      for (const field of fields) {
        // Skip document_type field as it's already handled
        if (field.key === 'document_type') continue;

        // Create a field key that includes the document type
        // NOTE: backend stores schema.properties in a Mongo/Mongoose Map, which cannot contain "." in keys.
        // We still *represent* nesting via "__" separators.
        const fieldKey = `documents__${documentType}__${field.key}`;

        const response = await fetch("/api/fields", {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fieldType: "files",
            key: fieldKey,
            label: field.label,
            type: field.type,
            required: field.required || false,
            description: field.description,
            isCustom: true,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: "Failed to save field" }));
          // Don't throw if field already exists
          if (!error.error?.includes("already exists")) {
            console.warn(`Failed to save field ${fieldKey}:`, error);
          }
        }
      }

      // Refresh schema
      mutateFields();
    } catch (error) {
      console.error("Error saving document type to schema:", error);
    } finally {
      setSavingDocumentType(null);
    }
  };

  const handlePushFiles = async () => {
    if (!selectedSubmissionId) {
      setPushError("Please select a deal");
      return;
    }

    if (documents.length === 0) {
      setPushError("Please add at least one document");
      return;
    }

    // Validate all documents have document_type
    const invalidDocs = documents.filter((doc) => !doc.document_type);
    if (invalidDocs.length > 0) {
      setPushError("Please set document type for all documents");
      return;
    }

    setIsPushing(true);
    setPushError(null);
    setPushSuccess(false);

    try {
      const client = await getClient();
      
      // Transform documents to the required format:
      // Each document needs a dynamic key wrapping the document data
      // The documents array should be wrapped in an object with "documents" key
      const formattedDocuments = documents.map((doc) => {
        // Generate a dynamic key for each document based on document_type
        const documentKey = doc.document_type 
          ? `${doc.document_type}_${Date.now()}_${Math.random().toString(36).substring(7)}`
          : `document_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        // Return object with dynamic key wrapping the document data
        return {
          [documentKey]: {
            ...doc,
          },
        };
      });

      // Wrap in the required format with submission_id
      const input = {
        submission_id: selectedSubmissionId,
        documents: formattedDocuments,
      };
      
      // Call the push-files action with the formatted input
      // The integrationKey is passed as an option
      const result = await client
        .action('push-files')
        .run(input, { integrationKey: selectedIntegration });

      // Extract upload results from the response
      if (result?.output?.files) {
        setUploadResults(result.output.files);
      } else {
        setUploadResults([]);
      }

      setPushSuccess(true);
      setDocuments([]); // Clear documents after successful push
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setPushSuccess(false);
      }, 3000);
    } catch (error) {
      console.error("Error pushing files:", error);
      setPushError(
        error instanceof Error ? error.message : "Failed to push files"
      );
    } finally {
      setIsPushing(false);
    }
  };

  const addDocument = () => {
    setDocuments([...documents, {}]);
  };

  const removeDocument = (index: number) => {
    setDocuments(documents.filter((_, i) => i !== index));
  };

  const updateDocument = (index: number, field: string, value: any) => {
    const updated = [...documents];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setDocuments(updated);

    // If document_type changed, save it to schema
    if (field === 'document_type' && value) {
      saveDocumentTypeToSchema(value, index);
    }
  };

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Files</h1>
        <p className="text-muted-foreground mt-2">
          Push document files to third-party systems
        </p>
      </div>

      {/* Integration Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <Label htmlFor="integration">Select Integration</Label>
          <Select
            id="integration"
            value={selectedIntegration}
            onChange={(e) => setSelectedIntegration(e.target.value)}
            className="mt-1"
          >
            <option value="hubspot">HubSpot</option>
            <option value="salesforce">Salesforce</option>
          </Select>
        </div>
      </div>

      {/* Deal Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="mb-4">
          <Label htmlFor="submission">Select Deal</Label>
          <div className="mt-1 relative record-selector-container">
            {selectedSubmissionId ? (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={recordsData?.records?.find(r => r.id === selectedSubmissionId)?.name || selectedSubmissionId}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSubmissionId("");
                    setShowRecordSelector(false);
                    setRecordSearchQuery("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRecordSelector(!showRecordSelector)}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search deals..."
                  value={recordSearchQuery}
                  onChange={(e) => {
                    setRecordSearchQuery(e.target.value);
                    setShowRecordSelector(true);
                  }}
                  onFocus={() => setShowRecordSelector(true)}
                  className="pl-10"
                />
              </div>
            )}

            {/* Dropdown with search results */}
            {showRecordSelector && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                {isLoadingRecords ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Loading records...</p>
                  </div>
                ) : recordsData?.records && recordsData.records.length > 0 ? (
                  <div className="py-1">
                    {recordsData.records.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => {
                          setSelectedSubmissionId(record.id);
                          setShowRecordSelector(false);
                          setRecordSearchQuery("");
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {record.name || record.id}
                        </div>
                        {record.fields?.ExternalId && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ID: {record.fields.ExternalId}
                          </div>
                        )}
                        {record.id !== record.name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {record.id}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                    <p className="text-sm">No records found</p>
                  </div>
                )}
              </div>
            )}
          </div>
          {selectedSubmissionId && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Selected: {selectedSubmissionId}
            </p>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">Documents</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Add documents to push to {selectedIntegration}
            </p>
          </div>
          <Button onClick={addDocument}>
            <FileText className="h-4 w-4 mr-2" />
            Add Document
          </Button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>No documents added yet. Click "Add Document" to get started.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {documents.map((doc, index) => {
              const docFields = getFieldsForDoc(doc);
              const hasDocumentType = !!doc.document_type;

              return (
                <div
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium">Document {index + 1}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDocument(index)}
                    >
                      Remove
                    </Button>
                  </div>

                  {/* Document Type Selection */}
                  <div className="mb-4">
                    <Label htmlFor={`document_type-${index}`}>
                      Document Type <span className="text-red-500 ml-1">*</span>
                    </Label>
                    <div className="mt-1">
                      <Input
                        id={`document_type-${index}`}
                        type="text"
                        list={`document_type_list_${index}`}
                        value={doc.document_type || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateDocument(index, 'document_type', value);
                        }}
                        placeholder="Type document type (e.g., tax_documents, bank_statement, photo_identification)"
                        className="w-full"
                      />
                      <datalist id={`document_type_list_${index}`}>
                        {documentTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    {hasDocumentType && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {savingDocumentType === index ? (
                          <span className="flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Saving document type to schema...
                          </span>
                        ) : (
                          "Document type saved to schema. Fill in the fields below."
                        )}
                      </p>
                    )}
                  </div>

                  {/* Document Type Fields */}
                  {hasDocumentType && docFields.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {docFields.map((field) => {
                        // Skip document_type field as it's already shown above
                        if (field.key === 'document_type') return null;

                        return (
                          <div key={field.key}>
                            <Label htmlFor={`${field.key}-${index}`}>
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            <Input
                              id={`${field.key}-${index}`}
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
                              value={doc[field.key] || ''}
                              onChange={(e) =>
                                updateDocument(
                                  index,
                                  field.key,
                                  field.type === 'number' ? Number(e.target.value) : e.target.value
                                )
                              }
                              className="mt-1"
                              placeholder={field.description}
                              required={field.required}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {hasDocumentType && docFields.length === 0 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                      No specific fields for this document type. You can add custom fields.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

            {/* Push Button */}
            {documents.length > 0 && (
              <div className="mt-6">
                {pushError && (
                  <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {pushError}
                    </p>
                  </div>
                )}
                {pushSuccess && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <p className="text-sm text-green-600 dark:text-green-400">
                      Files pushed successfully!
                    </p>
                  </div>
                )}
                <Button
                  onClick={handlePushFiles}
                  disabled={isPushing}
                  className="w-full"
                >
                  {isPushing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Pushing files...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Push Files to {selectedIntegration}
                    </>
                  )}
                </Button>
              </div>
            )}
      </div>

      {/* Upload Results Log */}
      {uploadResults.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Upload Results</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {uploadResults.length} file{uploadResults.length !== 1 ? 's' : ''} uploaded successfully
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setUploadResults([])}
            >
              Clear
            </Button>
          </div>

          <div className="space-y-4">
            {uploadResults.map((file, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          file.success
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}
                      >
                        {file.success ? 'Success' : 'Failed'}
                      </span>
                      {file.documentType && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {file.documentType}
                        </span>
                      )}
                      {file.fileName && (
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {file.fileName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {file.fileUri && (
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400">
                        Uploaded File URL:
                      </Label>
                      <div className="mt-1">
                        <a
                          href={file.fileUri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {file.fileUri}
                        </a>
                      </div>
                    </div>
                  )}

                  {file.sourceUrl && (
                    <div>
                      <Label className="text-xs text-gray-500 dark:text-gray-400">
                        Source URL:
                      </Label>
                      <div className="mt-1">
                        <a
                          href={file.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {file.sourceUrl}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    {file.contentType && (
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">
                          Content Type:
                        </Label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {file.contentType}
                        </p>
                      </div>
                    )}

                    {file.contentLength && (
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">
                          Size:
                        </Label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {(file.contentLength / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}

                    {file.documentKey && (
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">
                          Document Key:
                        </Label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 font-mono">
                          {file.documentKey}
                        </p>
                      </div>
                    )}

                    {file.index !== undefined && (
                      <div>
                        <Label className="text-xs text-gray-500 dark:text-gray-400">
                          Index:
                        </Label>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {file.index}
                        </p>
                      </div>
                    )}
                  </div>

                  {file.metadata && Object.keys(file.metadata).length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs text-gray-500 dark:text-gray-400">
                        Metadata:
                      </Label>
                      <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs font-mono">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(file.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
