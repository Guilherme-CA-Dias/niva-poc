import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/server-auth';
import { generateMembraneToken, MembraneTokenError } from '@/lib/membrane-token';

export async function GET(request: NextRequest) {
  try {
    const auth = getAuthFromRequest(request);
    const token = await generateMembraneToken(auth);
    return NextResponse.json({ token });
  } catch (error) {
    console.error('Error generating Membrane token:', error);
    if (error instanceof MembraneTokenError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
