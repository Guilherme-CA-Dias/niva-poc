import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { connectToDatabase } from '@/lib/mongodb';
import { FieldMapping } from '@/models/field-mapping';

// DELETE - Delete a field mapping
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = getAuthFromRequest(request);
    const { id } = params;

    await connectToDatabase();

    const mapping = await FieldMapping.findOneAndDelete({
      _id: id,
      customerId: auth.customerId,
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Field mapping not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting field mapping:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete field mapping' },
      { status: 500 }
    );
  }
}
