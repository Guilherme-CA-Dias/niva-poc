import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getMembraneClient } from '@/lib/membrane-client';
import { connectToDatabase } from '@/lib/mongodb';
import { FieldMapping } from '@/models/field-mapping';

// GET - List field mappings
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const { searchParams } = new URL(request.url);
    const integrationId = searchParams.get('integrationId');
    const integrationKey = searchParams.get('integrationKey');
    const objectType = searchParams.get('objectType');

    await connectToDatabase();

    const query: any = { customerId: auth.customerId };
    if (integrationId) query.integrationId = integrationId;
    if (integrationKey) query.integrationKey = integrationKey;
    if (objectType) query.objectType = objectType;

    const mappings = await FieldMapping.find(query);

    // Also fetch from Membrane if integrationId is provided
    if (integrationId) {
      try {
        const membrane = await getMembraneClient(auth);
        const membraneMappings = await membrane.fieldMappings.find({
          integrationId,
        });
        return NextResponse.json({
          mappings,
          membraneMappings,
        });
      } catch (error) {
        console.warn('Failed to fetch Membrane field mappings:', error);
      }
    }

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Error fetching field mappings:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch field mappings' },
      { status: 500 }
    );
  }
}

// POST - Create a field mapping
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const body = await request.json();
    const {
      integrationId,
      integrationKey,
      objectType,
      nivaField,
      crmField,
      customField,
      fieldType,
      computation,
    } = body;

    if (!integrationId || !integrationKey || !objectType || !nivaField || !crmField) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: integrationId, integrationKey, objectType, nivaField, crmField',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const mapping = await FieldMapping.create({
      customerId: auth.customerId,
      integrationId,
      integrationKey,
      objectType,
      nivaField,
      crmField,
      customField: customField || false,
      fieldType,
      computation,
    });

    return NextResponse.json({ mapping }, { status: 201 });
  } catch (error) {
    console.error('Error creating field mapping:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create field mapping' },
      { status: 500 }
    );
  }
}
