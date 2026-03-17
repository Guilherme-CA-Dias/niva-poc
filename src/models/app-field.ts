import mongoose from 'mongoose';
import type { SchemaField } from '@/types/schema';

// Internal field definition (for UI/editing)
export interface FieldDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'email' | 'phone';
  required?: boolean;
  description?: string;
  isCustom?: boolean;
  enum?: string[]; // For enum/select fields
  default?: string; // Default value
}

// MongoDB schema using Membrane-compatible format
export interface IAppFieldSchema {
  customerId: string;
  fieldType: 'submissions' | 'deals' | 'files';
  properties: Map<string, SchemaField>; // Membrane-compatible format
  required: string[]; // Array of field keys that are required
}

const schemaPropertySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    format: { type: String, required: false },
    enum: { type: [String], required: false },
    default: { type: String, required: false },
  },
  {
    _id: false,
    strict: false,
  }
);

// Add a pre-save middleware to clean up empty enums
schemaPropertySchema.pre('save', function (next) {
  if (Array.isArray(this.enum) && this.enum.length === 0) {
    this.enum = undefined;
  }
  next();
});

const appFieldSchema = new mongoose.Schema<IAppFieldSchema>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    fieldType: {
      type: String,
      required: true,
      enum: ['submissions', 'deals', 'files'],
    },
    properties: {
      type: Map,
      of: schemaPropertySchema,
      default: () => new Map(),
    },
    required: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique schema per customer and field type
appFieldSchema.index({ customerId: 1, fieldType: 1 }, { unique: true });

export const AppFieldSchema =
  mongoose.models.AppFieldSchema ||
  mongoose.model<IAppFieldSchema>('AppFieldSchema', appFieldSchema);

/**
 * Convert FieldDefinition to Membrane SchemaField format
 */
export function fieldDefinitionToSchemaField(field: FieldDefinition): SchemaField {
  const schemaField: SchemaField = {
    type: field.type === 'email' || field.type === 'phone' || field.type === 'date' ? 'string' : field.type,
    title: field.label,
  };

  // Add format for special string types
  if (field.type === 'email') {
    schemaField.format = 'email';
  } else if (field.type === 'phone') {
    schemaField.format = 'phone';
  } else if (field.type === 'date') {
    schemaField.format = 'date';
  }

  // Add enum if provided
  if (field.enum && field.enum.length > 0) {
    schemaField.enum = field.enum;
  }

  // Add default if provided
  if (field.default) {
    schemaField.default = field.default;
  }

  return schemaField;
}

/**
 * Convert Membrane SchemaField format to FieldDefinition
 */
export function schemaFieldToFieldDefinition(key: string, schemaField: SchemaField, isCustom: boolean = false): FieldDefinition {
  // Determine the field type based on format
  let type: FieldDefinition['type'] = 'string';
  if (schemaField.type === 'number') {
    type = 'number';
  } else if (schemaField.type === 'boolean') {
    type = 'boolean';
  } else if (schemaField.format === 'email') {
    type = 'email';
  } else if (schemaField.format === 'phone') {
    type = 'phone';
  } else if (schemaField.format === 'date') {
    type = 'date';
  }

  return {
    key,
    label: schemaField.title,
    type,
    required: false, // Will be set based on required array
    description: undefined,
    isCustom,
    enum: schemaField.enum,
    default: schemaField.default,
  };
}
