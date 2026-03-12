import jwt, { Algorithm } from 'jsonwebtoken';
import type { AuthCustomer } from './auth';

// Membrane workspace credentials
const WORKSPACE_KEY = process.env.MEMBRANE_WORKSPACE_KEY;
const WORKSPACE_SECRET = process.env.MEMBRANE_WORKSPACE_SECRET;
const CLIENT_KEY = process.env.MEMBRANE_CLIENT_KEY || 'niva-membrane-poc-app';

export class MembraneTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MembraneTokenError';
  }
}

export async function generateMembraneToken(auth: AuthCustomer): Promise<string> {
  if (!WORKSPACE_KEY || !WORKSPACE_SECRET) {
    throw new MembraneTokenError('Membrane credentials not configured');
  }

  try {
    const payload = {
      iss: WORKSPACE_KEY,
      id: auth.customerId,
      name: auth.customerName || auth.customerId,
      clientKey: CLIENT_KEY,
    };

    const options = {
      expiresIn: 7200, // 2 hours
      algorithm: 'HS256' as Algorithm,
    };

    return jwt.sign(payload, WORKSPACE_SECRET, options);
  } catch (error) {
    console.error('Error generating Membrane token:', error);
    throw new MembraneTokenError(
      error instanceof Error ? error.message : 'Failed to generate Membrane token'
    );
  }
}
