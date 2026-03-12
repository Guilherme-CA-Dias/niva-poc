import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/mongodb'
import { FieldSchema } from '@/models/schema'
import { FormDefinition } from '@/models/form'
import type { MongoSchemaProperty, SchemaField } from '@/types/schema'
import { DEFAULT_SCHEMAS } from '@/lib/default-schemas'

// Helper function to clean properties
const cleanSchemaProperties = (properties: Map<string, MongoSchemaProperty>) => {
  return Object.fromEntries(
    Array.from(properties.entries()).map(([key, value]) => {
      const cleanValue = value.toObject ? value.toObject() : value;
      
      // Remove empty enum arrays
      if (cleanValue.enum && Array.isArray(cleanValue.enum) && cleanValue.enum.length === 0) {
        delete cleanValue.enum;
      }
      
      return [key, cleanValue];
    })
  );
}

// Helper to create a new field
const createField = (field: { 
  name: string; 
  title: string; 
  type: string; 
  required?: boolean; 
  enum?: string[];
  default?: string 
}): MongoSchemaProperty => {
  const schemaField: SchemaField = {
    type: field.type === 'select' ? 'string' : field.type,
    title: field.title,
    ...(field.type === 'email' && { format: 'email' }),
    ...(field.type === 'phone' && { format: 'phone' }),
    ...(field.type === 'currency' && { format: 'currency' }),
    ...(field.type === 'date' && { format: 'date' }),
    ...(field.type === 'select' && field.enum && field.enum.length > 0 && { enum: field.enum }),
    ...(field.default && { default: field.default })
  };

  return {
    ...schemaField,
    toObject: () => ({
      type: schemaField.type,
      title: schemaField.title,
      ...(schemaField.format && { format: schemaField.format }),
      ...(schemaField.enum && schemaField.enum.length > 0 && { enum: schemaField.enum }),
      ...(schemaField.default && { default: schemaField.default })
    })
  };
}

export async function GET(
  request: Request,
  { params }: { params: { formId: string; userId: string } }
) {
  try {
    const { formId, userId } = await Promise.resolve(params)
    
    await connectToDatabase()

    const normalizedFormId = formId.toLowerCase()

    // First, verify the form exists
    const formDefinition = await FormDefinition.findOne({
      customerId: userId,
      formId: normalizedFormId
    })

    if (!formDefinition) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    let schema = await FieldSchema.findOne({
      customerId: userId,
      recordType: normalizedFormId
    })

    if (!schema) {
      const defaultSchema = DEFAULT_SCHEMAS[normalizedFormId as keyof typeof DEFAULT_SCHEMAS]
      
      if (!defaultSchema) {
        console.warn(`No default schema found for form type: ${normalizedFormId}`)
        schema = await FieldSchema.create({
          customerId: userId,
          recordType: normalizedFormId,
          properties: new Map(Object.entries({
            id: { type: 'string', title: 'ID' },
            name: { type: 'string', title: 'Name' }
          })),
          required: ['id', 'name']
        })
      } else {
        schema = await FieldSchema.create({
          customerId: userId,
          recordType: normalizedFormId,
          properties: new Map(Object.entries(defaultSchema.properties)),
          required: 'required' in defaultSchema ? [...defaultSchema.required] : []
        })
      }
    }

    const cleanProperties = cleanSchemaProperties(schema.properties)

    return NextResponse.json({
      schema: {
        type: "object",
        properties: cleanProperties,
        required: schema.required || []
      }
    })
  } catch (error) {
    console.error('Error loading schema:', error)
    return NextResponse.json(
      { error: 'Failed to load schema' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: { formId: string; userId: string } }
) {
  try {
    const { formId, userId } = await Promise.resolve(params)
    const { field } = await request.json()

    if (!field || !field.name || !field.type || !field.title) {
      return NextResponse.json({ error: 'Invalid field data' }, { status: 400 })
    }

    if (field.type === 'select' && (!field.enum || !field.enum.length)) {
      return NextResponse.json({ error: 'Select fields must have options' }, { status: 400 })
    }

    await connectToDatabase()

    // First, verify the form exists
    const formDefinition = await FormDefinition.findOne({
      customerId: userId,
      formId: formId.toLowerCase()
    })

    if (!formDefinition) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    let schema = await FieldSchema.findOne({
      customerId: userId,
      recordType: formId.toLowerCase()
    })

    if (!schema) {
      // For default forms, use the default schema
      const defaultSchema = DEFAULT_SCHEMAS[formId.toLowerCase() as keyof typeof DEFAULT_SCHEMAS]
      const initialProperties = defaultSchema?.properties || {
        id: { type: 'string', title: 'ID' },
        name: { type: 'string', title: 'Name' }
      }

      // Convert default properties to MongoSchemaProperty format
      const mongoProperties = new Map(
        Object.entries(initialProperties).map(([key, value]) => [
          key,
          createField({ name: key, ...value })
        ])
      )

      schema = await FieldSchema.create({
        customerId: userId,
        recordType: formId.toLowerCase(),
        properties: mongoProperties,
        required: defaultSchema?.required || ['id', 'name']
      })
    }

    const newField = createField({
      name: field.name,
      title: field.title,
      type: field.type,
      enum: field.enum,
      required: field.required
    })

    schema.properties.set(field.name, newField)

    if (field.required) {
      schema.required = [...new Set([...(schema.required || []), field.name])]
    }

    await schema.save()

    const cleanProperties = cleanSchemaProperties(schema.properties)

    return NextResponse.json({
      schema: {
        type: "object",
        properties: cleanProperties,
        required: schema.required
      }
    })
  } catch (error) {
    console.error('Error adding field:', error)
    return NextResponse.json(
      { error: 'Failed to add field' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { formId: string; userId: string } }
) {
  const { formId, userId } = await Promise.resolve(params)
  const { fieldName } = await request.json()

  await connectToDatabase()

  // First, verify the form exists
  const formDefinition = await FormDefinition.findOne({
    customerId: userId,
    formId: formId.toLowerCase()
  })

  if (!formDefinition) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 })
  }

  const schema = await FieldSchema.findOne({
    customerId: userId,
    recordType: formId.toLowerCase()
  })

  if (!schema) {
    return NextResponse.json({ error: 'Schema not found' }, { status: 404 })
  }

  schema.properties.delete(fieldName)
  schema.required = schema.required.filter((name: string) => name !== fieldName)

  await schema.save()

  const cleanProperties = cleanSchemaProperties(schema.properties)

  return NextResponse.json({
    schema: {
      type: "object",
      properties: cleanProperties,
      required: schema.required
    }
  })
} 
