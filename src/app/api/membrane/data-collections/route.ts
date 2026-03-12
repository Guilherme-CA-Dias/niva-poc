import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getMembraneClient } from '@/lib/membrane-client';

// GET - List records from a data collection
export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const path = searchParams.get('path'); // e.g., 'contacts' or 'deals'

    if (!connectionId || !path) {
      return NextResponse.json(
        { error: 'Missing required parameters: connectionId and path' },
        { status: 400 }
      );
    }

    const membrane = await getMembraneClient(auth);
    const records = await membrane.dataCollections.find({
      connectionId,
      path,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching data collection records:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch records' },
      { status: 500 }
    );
  }
}

// POST - Create a record in a data collection
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const body = await request.json();
    const { connectionId, path, fields } = body;

    if (!connectionId || !path || !fields) {
      return NextResponse.json(
        { error: 'Missing required fields: connectionId, path, and fields' },
        { status: 400 }
      );
    }

    const membrane = await getMembraneClient(auth);
    const record = await membrane.dataCollection(path).create({
      connectionId,
      fields,
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error creating data collection record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create record' },
      { status: 500 }
    );
  }
}
