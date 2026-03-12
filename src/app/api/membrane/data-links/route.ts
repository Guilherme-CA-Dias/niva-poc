import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getMembraneClient } from '@/lib/membrane-client';
import { connectToDatabase } from '@/lib/mongodb';
import { DataLink } from '@/models/data-link';

// GET - Find data links
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const { searchParams } = new URL(request.url);
    const dataCollectionId = searchParams.get('dataCollectionId');
    const localRecordId = searchParams.get('localRecordId');
    const connectionId = searchParams.get('connectionId');

    await connectToDatabase();

    const query: any = { customerId: auth.customerId };
    if (dataCollectionId) query.dataCollectionId = dataCollectionId;
    if (localRecordId) query.localRecordId = localRecordId;
    if (connectionId) query.connectionId = connectionId;

    const links = await DataLink.find(query);

    // Also fetch from Membrane if dataCollectionId is provided
    if (dataCollectionId && localRecordId) {
      try {
        const membrane = await getMembraneClient(auth);
        const membraneLink = await membrane.dataLinks.find({
          dataCollectionId,
          localRecordId,
        });
        return NextResponse.json({
          links,
          membraneLink,
        });
      } catch (error) {
        console.warn('Failed to fetch Membrane data link:', error);
      }
    }

    return NextResponse.json({ links });
  } catch (error) {
    console.error('Error fetching data links:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch data links' },
      { status: 500 }
    );
  }
}

// POST - Create a data link
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const body = await request.json();
    const {
      connectionId,
      dataCollectionId,
      dataCollectionPath,
      localRecordId,
      externalRecordId,
      integrationKey,
      objectType,
      syncDirection,
    } = body;

    if (
      !connectionId ||
      !dataCollectionId ||
      !dataCollectionPath ||
      !localRecordId ||
      !externalRecordId ||
      !integrationKey ||
      !objectType
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: connectionId, dataCollectionId, dataCollectionPath, localRecordId, externalRecordId, integrationKey, objectType',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const link = await DataLink.create({
      customerId: auth.customerId,
      connectionId,
      dataCollectionId,
      dataCollectionPath,
      localRecordId,
      externalRecordId,
      integrationKey,
      objectType,
      syncDirection: syncDirection || 'one-way',
      lastSyncedAt: new Date(),
      syncStatus: 'success',
    });

    return NextResponse.json({ link }, { status: 201 });
  } catch (error) {
    console.error('Error creating data link:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create data link' },
      { status: 500 }
    );
  }
}
