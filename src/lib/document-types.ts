/**
 * Document type definitions and their associated fields
 */

export interface DocumentTypeField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  required?: boolean;
  description?: string;
}

export interface DocumentTypeDefinition {
  type: string;
  label: string;
  fields: DocumentTypeField[];
}

/**
 * Predefined document types and their fields
 */
export const DOCUMENT_TYPES: Record<string, DocumentTypeDefinition> = {
  tax_documents: {
    type: 'tax_documents',
    label: 'Tax Documents',
    fields: [
      { key: 'document_type', label: 'Document Type', type: 'string', required: true },
      { key: 'url', label: 'Document URL', type: 'string', required: true },
      { key: 'tax_id', label: 'Tax ID', type: 'string', required: false },
      { key: 'postal_code', label: 'Postal Code', type: 'string', required: false },
      { key: 'tax_regime', label: 'Tax Regime', type: 'string', required: false },
      { key: 'business_name', label: 'Business Name', type: 'string', required: false },
      { key: 'beneficiary', label: 'Beneficiary', type: 'string', required: false },
    ],
  },
  bank_statement: {
    type: 'bank_statement',
    label: 'Bank Statement',
    fields: [
      { key: 'document_type', label: 'Document Type', type: 'string', required: true },
      { key: 'url', label: 'Document URL', type: 'string', required: true },
      { key: 'bank_account_number', label: 'Bank Account Number', type: 'string', required: false },
      { key: 'vendor', label: 'Vendor', type: 'string', required: false },
    ],
  },
  photo_identification: {
    type: 'photo_identification',
    label: 'Photo Identification',
    fields: [
      { key: 'document_type', label: 'Document Type', type: 'string', required: true },
      { key: 'url', label: 'Document URL', type: 'string', required: true },
      { key: 'name', label: 'Name on ID', type: 'string', required: false },
      { key: 'identification_type', label: 'Identification Type', type: 'string', required: false },
    ],
  },
};

/**
 * Get fields for a document type
 */
export function getFieldsForDocumentType(documentType: string): DocumentTypeField[] {
  const docType = DOCUMENT_TYPES[documentType];
  if (docType) {
    return docType.fields;
  }
  
  // For custom document types, return default fields
  return [
    { key: 'document_type', label: 'Document Type', type: 'string', required: true },
    { key: 'url', label: 'Document URL', type: 'string', required: true },
  ];
}

/**
 * Get all available document type labels
 */
export function getDocumentTypeOptions(): Array<{ value: string; label: string }> {
  return Object.values(DOCUMENT_TYPES).map((dt) => ({
    value: dt.type,
    label: dt.label,
  }));
}
