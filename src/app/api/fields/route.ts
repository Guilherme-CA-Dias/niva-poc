import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { AppFieldSchema, fieldDefinitionToSchemaField, schemaFieldToFieldDefinition } from '@/models/app-field';
import { DEFAULT_SUBMISSION_FIELDS, DEFAULT_DEAL_FIELDS } from '@/lib/default-fields';
import type { FieldDefinition } from '@/models/app-field';
import type { JSONSchemaProperty } from '@/types/contact-schema';

// Helper to convert Map to plain object for JSON response
function mapToObject<T>(map: Map<string, T>): Record<string, T> {
  const obj: Record<string, T> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

// Helper to separate default and custom fields
function separateFields(
  properties: Map<string, any>,
  fieldType: 'submissions' | 'deals'
): { defaultFields: Record<string, JSONSchemaProperty>; customFields: Record<string, JSONSchemaProperty> } {
  const defaultFields: Record<string, JSONSchemaProperty> = {};
  const customFields: Record<string, JSONSchemaProperty> = {};
  
  const defaultFieldList = fieldType === 'submissions' ? DEFAULT_SUBMISSION_FIELDS : DEFAULT_DEAL_FIELDS;
  const defaultFieldKeys = new Set(defaultFieldList.map(f => f.key));
  
  properties.forEach((value: any, key: string) => {
    const fieldProperty = {
      type: value.type,
      title: value.title,
      ...(value.format && { format: value.format }),
      ...(value.enum && value.enum.length > 0 && { enum: value.enum }),
      ...(value.default && { default: value.default }),
    };
    
    if (defaultFieldKeys.has(key)) {
      defaultFields[key] = fieldProperty;
    } else {
      customFields[key] = fieldProperty;
    }
  });
  
  return { defaultFields, customFields };
}

// GET - Get field schema for a customer and field type
// Returns in Membrane-compatible format
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);

    // Validate customerId is present
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Missing customer ID. Please authenticate first.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fieldType = searchParams.get('fieldType') as 'submissions' | 'deals' | null;

    if (!fieldType || (fieldType !== 'submissions' && fieldType !== 'deals')) {
      return NextResponse.json(
        { error: 'Invalid or missing fieldType. Must be "submissions" or "deals"' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find schema for this specific customer and field type
    const schema = await AppFieldSchema.findOne({
      customerId: auth.customerId,
      fieldType,
    });

    // If no schema exists, return empty Membrane-compatible schema
    if (!schema) {
      return NextResponse.json({
        type: 'object',
        properties: {},
        required: [],
      });
    }

    // Convert Map to plain object for JSON response
    // Separate default fields and custom fields
    const properties: Record<string, any> = {};
    const customProperties: Record<string, JSONSchemaProperty> = {};
    
    if (schema.properties && schema.properties instanceof Map) {
      // Get default field keys for the field type
      const defaultFields = fieldType === 'submissions' ? DEFAULT_SUBMISSION_FIELDS : DEFAULT_DEAL_FIELDS;
      const defaultFieldKeys = new Set(defaultFields.map(f => f.key));
      
      schema.properties.forEach((value: any, key: string) => {
        const fieldProperty = {
          type: value.type,
          title: value.title,
          ...(value.format && { format: value.format }),
          ...(value.enum && value.enum.length > 0 && { enum: value.enum }),
          ...(value.default && { default: value.default }),
        };
        
        // If it's a custom field, add to custom properties
        if (!defaultFieldKeys.has(key)) {
          customProperties[key] = fieldProperty;
        } else {
          // Otherwise, add to regular properties
          properties[key] = fieldProperty;
        }
      });
    }
    
    // Add custom object if there are custom fields
    if (Object.keys(customProperties).length > 0) {
      properties.custom = {
        type: 'object',
        properties: customProperties,
      };
    }

    // Return in Membrane-compatible format
    return NextResponse.json({
      type: 'object',
      properties,
      required: schema.required || [],
    });
  } catch (error) {
    console.error('Error fetching fields:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch fields' },
      { status: 500 }
    );
  }
}

// POST - Initialize default fields or add custom field
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);

    // Validate customerId is present
    if (!auth.customerId) {
      return NextResponse.json(
        { error: 'Missing customer ID. Please authenticate first.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { initializeDefaults, fieldType, key, label, type, required, description, isCustom, enum: enumValues, default: defaultValue } = body;

    if (!fieldType || (fieldType !== 'submissions' && fieldType !== 'deals')) {
      return NextResponse.json(
        { error: 'Invalid fieldType. Must be "submissions" or "deals"' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // If initializeDefaults is true, create/update schema with default fields
    if (initializeDefaults) {
      const defaultFieldsList =
        fieldType === 'submissions' ? DEFAULT_SUBMISSION_FIELDS : DEFAULT_DEAL_FIELDS;

      // Convert to Membrane format
      const properties = new Map<string, any>();
      const required: string[] = [];

      defaultFieldsList.forEach((field) => {
        const schemaField = fieldDefinitionToSchemaField({
          key: field.key,
          label: field.label,
          type: field.type,
          required: field.required || false,
          description: field.description,
          isCustom: false,
        });
        properties.set(field.key, schemaField);

        if (field.required) {
          required.push(field.key);
        }
      });

      // Upsert: create if doesn't exist, update if it does
      const schema = await AppFieldSchema.findOneAndUpdate(
        {
          customerId: auth.customerId,
          fieldType,
        },
        {
          customerId: auth.customerId,
          fieldType,
          properties,
          required,
        },
        {
          upsert: true,
          new: true,
        }
      );

      // Return in Membrane-compatible format
      const { defaultFields: defaultFieldsMap, customFields } = separateFields(schema.properties, fieldType);
      const responseProperties: Record<string, any> = { ...defaultFieldsMap };
      
      if (Object.keys(customFields).length > 0) {
        responseProperties.custom = {
          type: 'object',
          properties: customFields,
        };
      }

      return NextResponse.json(
        {
          type: 'object',
          properties: responseProperties,
          required: schema.required || [],
          message: `Default fields for ${fieldType} initialized successfully`,
        },
        { status: 201 }
      );
    }

    // Otherwise, add a custom field
    if (!key || !label || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: key, label, type' },
        { status: 400 }
      );
    }

    // Get or create the schema
    let schema = await AppFieldSchema.findOne({
      customerId: auth.customerId,
      fieldType,
    });

    if (!schema) {
      // Create new schema with empty properties and required arrays
      schema = await AppFieldSchema.create({
        customerId: auth.customerId,
        fieldType,
        properties: new Map(),
        required: [],
      });
    }

    // Ensure properties is initialized as Map
    if (!schema.properties || !(schema.properties instanceof Map)) {
      schema.properties = new Map();
    }

    // Check if field with same key already exists
    if (schema.properties.has(key)) {
      return NextResponse.json(
        { error: 'Field with this key already exists' },
        { status: 400 }
      );
    }

    // Convert to Membrane format and add the field
    const schemaField = fieldDefinitionToSchemaField({
      key,
      label,
      type,
      required: required || false,
      description,
      isCustom: true,
      enum: enumValues,
      default: defaultValue,
    });

    schema.properties.set(key, schemaField);

    // Add to required array if needed
    if (required && !schema.required.includes(key)) {
      schema.required.push(key);
    }

    await schema.save();

    // Ensure properties is initialized as Map
    if (!schema.properties || !(schema.properties instanceof Map)) {
      schema.properties = new Map();
    }

    // Return the updated schema in Membrane format
    const { defaultFields, customFields } = separateFields(schema.properties, fieldType);
    const responseProperties: Record<string, any> = { ...defaultFields };
    
    if (Object.keys(customFields).length > 0) {
      responseProperties.custom = {
        type: 'object',
        properties: customFields,
      };
    }

    return NextResponse.json(
      {
        type: 'object',
        properties: responseProperties,
        required: schema.required || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating field:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create field' },
      { status: 500 }
    );
  }
}
