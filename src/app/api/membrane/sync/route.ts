import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { processNivaEvent } from '@/lib/membrane-sync';

interface NivaEventPayload {
  customerId: string;
  eventType: 'start_submission' | 'upload_documents' | 'upload_contract' | 'approved' | 'rejected' | 'manual_review';
  data: {
    id: string;
    [key: string]: any;
  };
}

/**
 * Webhook endpoint for Niva events
 * Processes events and syncs to CRM with upsert logic
 */
export async function POST(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const payload = (await request.json()) as NivaEventPayload;

    // Validate payload
    if (!payload.eventType || !payload.data || !payload.data.id) {
      return NextResponse.json(
        { error: 'Invalid payload: missing eventType or data.id' },
        { status: 400 }
      );
    }

    // Process the event
    await processNivaEvent(auth, payload);

    return NextResponse.json({
      success: true,
      message: 'Event processed and synced to CRM',
    });
  } catch (error) {
    console.error('Error processing Niva event:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process event',
      },
      { status: 500 }
    );
  }
}
