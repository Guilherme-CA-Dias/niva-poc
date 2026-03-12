import mongoose from 'mongoose';

export interface IFieldMapping {
  customerId: string;
  integrationId: string;
  integrationKey: string; // 'hubspot' or 'salesforce'
  objectType: 'deal' | 'contact'; // CRM object type
  nivaField: string; // Field from Niva's global schema
  crmField: string; // Field in the CRM
  customField?: boolean; // Whether this is a custom field
  fieldType?: string; // Type of the field (string, number, date, etc.)
  computation?: {
    type: 'notes' | 'computed'; // Type of computation
    source?: string[]; // Source fields for computation
    formula?: string; // Formula for computation
  };
}

const fieldMappingSchema = new mongoose.Schema<IFieldMapping>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    integrationId: {
      type: String,
      required: true,
    },
    integrationKey: {
      type: String,
      required: true,
      enum: ['hubspot', 'salesforce'],
    },
    objectType: {
      type: String,
      required: true,
      enum: ['deal', 'contact'],
    },
    nivaField: {
      type: String,
      required: true,
    },
    crmField: {
      type: String,
      required: true,
    },
    customField: {
      type: Boolean,
      default: false,
    },
    fieldType: {
      type: String,
    },
    computation: {
      type: {
        type: String,
        enum: ['notes', 'computed'],
      },
      source: [String],
      formula: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
fieldMappingSchema.index({ customerId: 1, integrationId: 1, objectType: 1 });

export const FieldMapping =
  mongoose.models.FieldMapping ||
  mongoose.model<IFieldMapping>('FieldMapping', fieldMappingSchema);
