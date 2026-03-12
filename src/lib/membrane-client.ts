import { MembraneClient } from '@membranehq/sdk';
import { generateMembraneToken } from './membrane-token';
import type { AuthCustomer } from './auth';

let clientInstance: MembraneClient | null = null;

export class MembraneClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MembraneClientError';
  }
}

export async function getMembraneClient(auth: AuthCustomer): Promise<MembraneClient> {
  try {
    // Generate a fresh token for the customer
    const token = await generateMembraneToken(auth);

    // Create a new client instance with the fresh token
    const client = new MembraneClient({
      fetchToken: async () => {
        // Return the token we just generated
        return token;
      },
    });

    return client;
  } catch (error) {
    console.error('Failed to initialize Membrane client:', error);
    throw new MembraneClientError(
      error instanceof Error ? error.message : 'Failed to initialize Membrane client'
    );
  }
}

/**
 * Use this when you need to ensure a single client instance is reused
 * Note: The token used will be from when the client was first initialized
 */
export async function getSharedMembraneClient(auth: AuthCustomer): Promise<MembraneClient> {
  if (!clientInstance) {
    clientInstance = await getMembraneClient(auth);
  }
  return clientInstance;
}

/**
 * Reset the shared client instance, forcing a new one to be created next time
 */
export function resetSharedMembraneClient(): void {
  clientInstance = null;
}
