import type { FieldDefinition } from '@/models/app-field';

/**
 * Default fields based on Niva's Submission payload
 */
export const DEFAULT_SUBMISSION_FIELDS: FieldDefinition[] = [
  {
    key: 'submission_id',
    label: 'Submission ID',
    type: 'string',
    required: true,
    description: "Niva's submission ID, used to compute fields",
  },
  {
    key: 'customer_id',
    label: 'Customer ID',
    type: 'string',
    required: true,
    description: "Niva's customer / tenant ID",
  },
  {
    key: 'business_type',
    label: 'Business Type',
    type: 'string',
    required: true,
    description: 'Business type (legal entity / sole proprietor)',
  },
  {
    key: 'status',
    label: 'Status',
    type: 'string',
    required: true,
    description: 'Status of the submission (approved, rejected, needs_review)',
  },
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: false,
    description: 'Email address for applicant',
  },
  {
    key: 'first_name',
    label: 'First Name',
    type: 'string',
    required: false,
    description: 'First name of applicant',
  },
  {
    key: 'last_name',
    label: 'Last Name',
    type: 'string',
    required: false,
    description: 'Last name of applicant',
  },
  {
    key: 'telephone',
    label: 'Telephone',
    type: 'phone',
    required: false,
    description: 'Phone number of applicant',
  },
  {
    key: 'company',
    label: 'Company',
    type: 'string',
    required: false,
    description: 'Company name',
  },
  {
    key: 'address',
    label: 'Address',
    type: 'string',
    required: false,
    description: 'Address for the business',
  },
  {
    key: 'document_upload_url',
    label: 'Document Upload URL',
    type: 'string',
    required: true,
    description: 'URL to re-upload documents in case there are issues in the submission',
  },
  // Custom fields
  {
    key: 'custom_industry',
    label: 'Industry',
    type: 'string',
    required: false,
    description: 'Industry of the business (from custom.industry)',
  },
  {
    key: 'custom_sales_channel',
    label: 'Sales Channel',
    type: 'string',
    required: false,
    description: 'Sales channel (offline, online, social, both)',
  },
  {
    key: 'custom_website',
    label: 'Website',
    type: 'string',
    required: false,
    description: 'Website URL or social profile (from custom.website)',
  },
  {
    key: 'custom_monthly_revenue',
    label: 'Monthly Revenue',
    type: 'string',
    required: false,
    description: 'Monthly sales revenue (from custom.monthly_revenue)',
  },
  {
    key: 'custom_e_commerce_platform',
    label: 'E-commerce Platform',
    type: 'string',
    required: false,
    description: 'Ecommerce platform mappings (Shopify, Vix, etc.)',
  },
  {
    key: 'custom_campaign_source',
    label: 'Campaign Source',
    type: 'string',
    required: false,
    description: 'Source of the campaign, a query parameter',
  },
  {
    key: 'custom_address',
    label: 'Business Address',
    type: 'string',
    required: false,
    description: 'Address of the business (from custom.address)',
  },
  {
    key: 'custom_rejection_reason',
    label: 'Rejection Reason',
    type: 'string',
    required: false,
    description: 'Rejection reason for the business',
  },
  {
    key: 'custom_manual_review_reason1',
    label: 'Manual Review Reason 1',
    type: 'string',
    required: false,
    description: 'Review reason for the business',
  },
  {
    key: 'custom_manual_review_reason2',
    label: 'Manual Review Reason 2',
    type: 'string',
    required: false,
    description: 'Review reason for the business',
  },
];

/**
 * Default fields based on HubSpot Deal creation payload
 */
export const DEFAULT_DEAL_FIELDS: FieldDefinition[] = [
  {
    key: 'email',
    label: 'Email',
    type: 'email',
    required: false,
    description: 'Email address',
  },
  {
    key: 'firstname',
    label: 'First Name',
    type: 'string',
    required: false,
    description: 'First name',
  },
  {
    key: 'lastname',
    label: 'Last Name',
    type: 'string',
    required: false,
    description: 'Last name',
  },
  {
    key: 'mobilephone',
    label: 'Mobile Phone',
    type: 'phone',
    required: false,
    description: 'Mobile phone number',
  },
  {
    key: 'company',
    label: 'Company',
    type: 'string',
    required: false,
    description: 'Company name',
  },
  {
    key: 'industrynew',
    label: 'Industry',
    type: 'string',
    required: false,
    description: 'Industry (e.g., Construcción y Herramientas)',
  },
  {
    key: 'industria',
    label: 'Industria',
    type: 'string',
    required: false,
    description: 'Industria (e.g., Online)',
  },
  {
    key: 'website',
    label: 'Website',
    type: 'string',
    required: false,
    description: 'Website URL',
  },
  {
    key: 'monthly_revenue__mxn_',
    label: 'Monthly Revenue (MXN)',
    type: 'string',
    required: false,
    description: 'Monthly revenue in MXN',
  },
  {
    key: 'e_commerce_platform',
    label: 'E-commerce Platform',
    type: 'string',
    required: false,
    description: 'E-commerce platform (e.g., UNKOWN)',
  },
  {
    key: 'campaign_source',
    label: 'Campaign Source',
    type: 'string',
    required: false,
    description: 'Campaign source (e.g., Chatbot_Organic)',
  },
  {
    key: 'carga_de_documentos',
    label: 'Document Upload URL',
    type: 'string',
    required: false,
    description: 'URL for document uploads',
  },
];

/**
 * Default CRM/Deal fields mapping (based on HubSpot Deal creation payload)
 * These represent the target CRM fields that Niva fields should map to
 */
export const DEFAULT_CRM_FIELD_MAPPINGS: Record<string, string> = {
  // Direct mappings
  email: 'email',
  first_name: 'firstname',
  last_name: 'lastname',
  telephone: 'mobilephone',
  company: 'company',
  custom_industry: 'industrynew',
  custom_website: 'website',
  custom_monthly_revenue: 'monthly_revenue__mxn_',
  custom_e_commerce_platform: 'e_commerce_platform',
  custom_campaign_source: 'campaign_source',
  document_upload_url: 'carga_de_documentos',
  // Additional mappings
  custom_sales_channel: 'industria', // Maps to "industria" field in HubSpot
};

/**
 * Default document fields for files page
 * Documents is an array of objects with dynamic keys and document_type-specific fields
 */
export const DEFAULT_DOCUMENT_FIELDS: FieldDefinition[] = [
  {
    key: 'documents',
    label: 'Documents',
    type: 'string', // Will be handled as array of objects in the schema
    required: false,
    description: 'Array of document objects with document_type and related fields',
  },
  // Document type: tax_documents
  {
    key: 'document_type_tax_documents',
    label: 'Document Type: Tax Documents',
    type: 'string',
    required: false,
    description: 'Tax documents document type',
    enum: ['tax_documents'],
  },
  {
    key: 'tax_id',
    label: 'Tax ID',
    type: 'string',
    required: false,
    description: 'Tax ID for tax documents',
  },
  {
    key: 'postal_code',
    label: 'Postal Code',
    type: 'string',
    required: false,
    description: 'Postal code for tax documents',
  },
  {
    key: 'tax_regime',
    label: 'Tax Regime',
    type: 'string',
    required: false,
    description: 'Tax regime for tax documents',
  },
  {
    key: 'business_name',
    label: 'Business Name',
    type: 'string',
    required: false,
    description: 'Business name for tax documents',
  },
  {
    key: 'beneficiary',
    label: 'Beneficiary',
    type: 'string',
    required: false,
    description: 'Beneficiary for tax documents',
  },
  // Document type: bank_statement
  {
    key: 'document_type_bank_statement',
    label: 'Document Type: Bank Statement',
    type: 'string',
    required: false,
    description: 'Bank statement document type',
    enum: ['bank_statement'],
  },
  {
    key: 'bank_account_number',
    label: 'Bank Account Number',
    type: 'string',
    required: false,
    description: 'Bank account number for bank statements',
  },
  {
    key: 'vendor',
    label: 'Vendor',
    type: 'string',
    required: false,
    description: 'Vendor for bank statements',
  },
  // Document type: photo_identification
  {
    key: 'document_type_photo_identification',
    label: 'Document Type: Photo Identification',
    type: 'string',
    required: false,
    description: 'Photo identification document type',
    enum: ['photo_identification'],
  },
  {
    key: 'name',
    label: 'Name',
    type: 'string',
    required: false,
    description: 'Name for photo identification',
  },
  {
    key: 'identification_type',
    label: 'Identification Type',
    type: 'string',
    required: false,
    description: 'Identification type for photo identification',
  },
  // Common document fields
  {
    key: 'url',
    label: 'Document URL',
    type: 'string',
    required: false,
    description: 'URL to the document file',
  },
];
