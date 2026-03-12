import { NextRequest } from 'next/server'
import type { AuthCustomer } from './auth'
import { decodeJwt } from 'jose'

export function getAuthFromRequest(request: NextRequest): AuthCustomer {
    // Check x-auth-id first, then fallback to X-Membrane-Token
    const authIdHeader = request.headers.get('x-auth-id') ?? request.headers.get('X-Membrane-Token') ?? '';
    const customerNameHeader = request.headers.get('x-customer-name') ?? null;

    // Try to decode as JWT token first
    let customerId = authIdHeader;
    let customerName = customerNameHeader;

    if (authIdHeader) {
        try {
            // Decode JWT without verification (since we just need the payload)
            const decoded = decodeJwt(authIdHeader);
            
            // Extract customer ID from JWT payload
            // The payload can have 'id' or 'customerId' field
            if (decoded.id) {
                customerId = decoded.id as string;
            } else if (decoded.customerId) {
                customerId = decoded.customerId as string;
            }

            // Extract customer name from JWT payload if available
            if (decoded.name && !customerName) {
                customerName = decoded.name as string;
            }
        } catch (error) {
            // If decoding fails, assume it's already a plain customer ID
            // Keep the original value
            console.warn('Failed to decode JWT token, using as-is:', error);
        }
    }

    return {
        customerId,
        customerName
    }
} 