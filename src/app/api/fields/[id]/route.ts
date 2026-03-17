import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { AppFieldSchema, fieldDefinitionToSchemaField } from '@/models/app-field';
import { DEFAULT_SUBMISSION_FIELDS, DEFAULT_DEAL_FIELDS, DEFAULT_DOCUMENT_FIELDS } from '@/lib/default-fields';
import type { JSONSchemaProperty } from '@/types/contact-schema';

// Helper to separate default and custom fields
function separateFields(
  properties: Map<string, any>,
  fieldType: 'submissions' | 'deals' | 'files'
): { defaultFields: Record<string, JSONSchemaProperty>; customFields: Record<string, JSONSchemaProperty> } {
  const defaultFields: Record<string, JSONSchemaProperty> = {};
  const customFields: Record<string, JSONSchemaProperty> = {};
  
  const defaultFieldList = 
    fieldType === 'submissions' ? DEFAULT_SUBMISSION_FIELDS :
    fieldType === 'deals' ? DEFAULT_DEAL_FIELDS :
    DEFAULT_DOCUMENT_FIELDS;
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

// Helper to convert Map to plain object for JSON response
function mapToObject<T>(map: Map<string, T>): Record<string, T> {
  const obj: Record<string, T> = {};
  map.forEach((value, key) => {
    obj[key] = value;
  });
  return obj;
}

// DELETE - Delete a field from the schema
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fieldType = searchParams.get('fieldType') as 'submissions' | 'deals' | 'files' | null;
    const fieldKey = params.id; // The "id" is actually the field key

    if (!fieldType || (fieldType !== 'submissions' && fieldType !== 'deals' && fieldType !== 'files')) {
      return NextResponse.json(
        { error: 'Invalid or missing fieldType' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find schema for this specific customer and field type
    const schema = await AppFieldSchema.findOne({
      customerId: auth.customerId,
      fieldType,
    });

    if (!schema) {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    // Ensure properties is initialized as Map
    if (!schema.properties || !(schema.properties instanceof Map)) {
      schema.properties = new Map();
    }

    // Check if field exists
    if (!schema.properties.has(fieldKey)) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    // Remove the field from properties
    schema.properties.delete(fieldKey);

    // Remove from required array if present
    schema.required = schema.required.filter((key: string) => key !== fieldKey);

    await schema.save();

    // Ensure properties is initialized as Map
    if (!schema.properties || !(schema.properties instanceof Map)) {
      schema.properties = new Map();
    }

    // Return updated schema in Membrane format
    const { defaultFields, customFields } = separateFields(schema.properties, fieldType);
    const properties: Record<string, any> = { ...defaultFields };
    
    if (Object.keys(customFields).length > 0) {
      properties.custom = {
        type: 'object',
        properties: customFields,
      };
    }

    return NextResponse.json({
      type: 'object',
      properties,
      required: schema.required || [],
      success: true,
    });
  } catch (error) {
    console.error('Error deleting field:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete field' },
      { status: 500 }
    );
  }
}

// PUT - Update a field in the schema
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const fieldKey = params.id; // The "id" is actually the field key
    const body = await request.json();
    const { label, type, required, description, enum: enumValues, default: defaultValue } = body;

    if (!fieldType || (fieldType !== 'submissions' && fieldType !== 'deals')) {
      return NextResponse.json(
        { error: 'Invalid or missing fieldType' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find schema for this specific customer and field type
    const schema = await AppFieldSchema.findOne({
      customerId: auth.customerId,
      fieldType,
    });

    if (!schema) {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    // Ensure properties is initialized as Map
    if (!schema.properties || !(schema.properties instanceof Map)) {
      schema.properties = new Map();
    }

    // Check if field exists
    if (!schema.properties.has(fieldKey)) {
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    // Get existing field
    const existingField = schema.properties.get(fieldKey);

    // Update the field properties
    if (label !== undefined) existingField.title = label;
    if (type !== undefined) {
      // Update type and format accordingly
      existingField.type = type === 'email' || type === 'phone' || type === 'date' ? 'string' : type;
      if (type === 'email') {
        existingField.format = 'email';
      } else if (type === 'phone') {
        existingField.format = 'phone';
      } else if (type === 'date') {
        existingField.format = 'date';
      } else {
        existingField.format = undefined;
      }
    }
    if (enumValues !== undefined) {
      existingField.enum = enumValues && enumValues.length > 0 ? enumValues : undefined;
    }
    if (defaultValue !== undefined) {
      existingField.default = defaultValue || undefined;
    }

    // Update required array
    if (required !== undefined) {
      if (required && !schema.required.includes(fieldKey)) {
        schema.required.push(fieldKey);
      } else if (!required) {
        schema.required = schema.required.filter((key: string) => key !== fieldKey);
      }
    }

    schema.properties.set(fieldKey, existingField);
    await schema.save();

    // Ensure properties is initialized as Map
    if (!schema.properties || !(schema.properties instanceof Map)) {
      schema.properties = new Map();
    }

    // Return updated schema in Membrane format
    const { defaultFields, customFields } = separateFields(schema.properties, fieldType);
    const properties: Record<string, any> = { ...defaultFields };
    
    if (Object.keys(customFields).length > 0) {
      properties.custom = {
        type: 'object',
        properties: customFields,
      };
    }

    return NextResponse.json({
      type: 'object',
      properties,
      required: schema.required || [],
    });
  } catch (error) {
    console.error('Error updating field:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update field' },
      { status: 500 }
    );
  }
}
