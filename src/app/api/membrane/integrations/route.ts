import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { IntegrationConfig } from '@/models/integration-config';

// GET - List integration configurations
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const { searchParams } = new URL(request.url);
    const integrationKey = searchParams.get('integrationKey');
    const objectType = searchParams.get('objectType');

    await connectToDatabase();

    const query: any = { customerId: auth.customerId };
    if (integrationKey) query.integrationKey = integrationKey;
    if (objectType) query.objectType = objectType;

    const configs = await IntegrationConfig.find(query);

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Error fetching integration configs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

// POST - Create or update integration configuration
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const body = await request.json();
    const {
      integrationKey,
      connectionId,
      integrationId,
      objectType,
      enabled,
      syncDirection,
      customFields,
    } = body;

    if (!integrationKey || !objectType) {
      return NextResponse.json(
        { error: 'Missing required fields: integrationKey and objectType' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const config = await IntegrationConfig.findOneAndUpdate(
      {
        customerId: auth.customerId,
        integrationKey,
        objectType,
      },
      {
        customerId: auth.customerId,
        integrationKey,
        connectionId,
        integrationId,
        objectType,
        enabled: enabled !== undefined ? enabled : true,
        syncDirection: syncDirection || 'one-way',
        customFields: customFields || {},
      },
      {
        upsert: true,
        new: true,
      }
    );

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Error creating/updating integration config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save integration config' },
      { status: 500 }
    );
  }
}
