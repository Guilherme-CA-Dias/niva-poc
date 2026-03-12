import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { getMembraneClient } from '@/lib/membrane-client';

// PUT - Update a record in a data collection
export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string; recordId: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    const body = await request.json();
    const { connectionId, fields } = body;
    const { path, recordId } = params;

    if (!connectionId || !fields) {
      return NextResponse.json(
        { error: 'Missing required fields: connectionId and fields' },
        { status: 400 }
      );
    }

    const membrane = await getMembraneClient(auth);
    const record = await membrane.dataCollection(path).update(recordId, {
      connectionId,
      fields,
    });

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error updating data collection record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update record' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a record from a data collection
export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string; recordId: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');
    const { path, recordId } = params;

    if (!connectionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: connectionId' },
        { status: 400 }
      );
    }

    const membrane = await getMembraneClient(auth);
    await membrane.dataCollection(path).delete(recordId, {
      connectionId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting data collection record:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete record' },
      { status: 500 }
    );
  }
}
