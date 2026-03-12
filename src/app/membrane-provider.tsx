'use client';

import { createContext, useContext, ReactNode } from 'react';
import { MembraneClient } from '@membranehq/sdk';
import { getAuthHeaders } from './auth-provider';

interface MembraneContextType {
  getClient: () => Promise<MembraneClient>;
}

const MembraneContext = createContext<MembraneContextType | null>(null);

export function useMembrane() {
  const context = useContext(MembraneContext);
  if (!context) {
    throw new Error('useMembrane must be used within MembraneProvider');
  }
  return context;
}

export function MembraneProviderWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const getClient = async (): Promise<MembraneClient> => {
    const response = await fetch('/api/membrane-token', {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch Membrane token');
    }

    return new MembraneClient({
      fetchToken: async () => {
        const tokenResponse = await fetch('/api/membrane-token', {
          headers: getAuthHeaders(),
        });
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
          throw new Error(tokenData.error || 'Failed to fetch Membrane token');
        }
        return tokenData.token;
      },
    });
  };

  return (
    <MembraneContext.Provider value={{ getClient }}>
      {children}
    </MembraneContext.Provider>
  );
}
