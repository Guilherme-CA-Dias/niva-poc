import { getMembraneClient } from './membrane-client';
import { connectToDatabase } from './mongodb';
import { FieldMapping } from '@/models/field-mapping';
import { DataLink } from '@/models/data-link';
import { IntegrationConfig } from '@/models/integration-config';
import type { AuthCustomer } from './auth';

interface NivaEventPayload {
  customerId: string;
  eventType: 'start_submission' | 'upload_documents' | 'upload_contract' | 'approved' | 'rejected' | 'manual_review';
  data: {
    id: string;
    [key: string]: any;
  };
}

interface MappedFields {
  [crmField: string]: any;
}

/**
 * Get field mappings for a customer and integration
 */
export async function getFieldMappings(
  customerId: string,
  integrationKey: string,
  objectType: 'deal' | 'contact'
): Promise<Map<string, string>> {
  await connectToDatabase();

  const mappings = await FieldMapping.find({
    customerId,
    integrationKey,
    objectType,
  });

  const fieldMap = new Map<string, string>();
  mappings.forEach((mapping) => {
    fieldMap.set(mapping.nivaField, mapping.crmField);
  });

  return fieldMap;
}

/**
 * Map Niva fields to CRM fields using field mappings
 */
export function mapFieldsToCRM(
  nivaData: Record<string, any>,
  fieldMappings: Map<string, string>,
  customFields?: Record<string, any>
): MappedFields {
  const mappedFields: MappedFields = {};

  // Map standard fields
  fieldMappings.forEach((crmField, nivaField) => {
    if (nivaData[nivaField] !== undefined) {
      mappedFields[crmField] = nivaData[nivaField];
    }
  });

  // Add custom fields
  if (customFields) {
    Object.entries(customFields).forEach(([key, value]) => {
      mappedFields[key] = value;
    });
  }

  return mappedFields;
}

/**
 * Compute computed fields (e.g., notes/comments from activities)
 */
export function computeFields(
  nivaData: Record<string, any>,
  fieldMappings: Map<string, string>
): MappedFields {
  const computed: MappedFields = {};

  // Example: Compute notes field from activities
  // This would be customized based on actual requirements
  if (nivaData.activities && Array.isArray(nivaData.activities)) {
    const notes = nivaData.activities
      .sort((a: any, b: any) => {
        const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
        const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
        return dateB - dateA; // Sort descending
      })
      .map((activity: any) => {
        return `[${activity.type || 'Activity'}] ${activity.description || activity.message || ''} - ${activity.timestamp || activity.createdAt || ''}`;
      })
      .join('\n\n');

    // Find the notes field mapping
    fieldMappings.forEach((crmField, nivaField) => {
      if (nivaField === 'notes' || nivaField === 'comments') {
        computed[crmField] = notes;
      }
    });
  }

  return computed;
}

/**
 * Handle file uploads - download files and prepare for CRM upload
 */
export async function prepareFilesForCRM(
  fileUrls: string[],
  _auth: AuthCustomer
): Promise<Array<{ name: string; content: Buffer; contentType?: string }>> {
  const files: Array<{ name: string; content: Buffer; contentType?: string }> = [];

  for (const url of fileUrls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || 'application/octet-stream';
      const buffer = Buffer.from(await response.arrayBuffer());
      const fileName = url.split('/').pop() || 'file';

      files.push({
        name: fileName,
        content: buffer,
        contentType,
      });
    } catch (error) {
      console.error(`Failed to download file ${url}:`, error);
    }
  }

  return files;
}

/**
 * Sync Niva record to CRM with upsert logic
 */
export async function syncNivaToCRM(
  auth: AuthCustomer,
  integrationKey: 'hubspot' | 'salesforce',
  objectType: 'deal' | 'contact',
  connectionId: string,
  nivaRecord: Record<string, any>,
  fieldMappings: Map<string, string>,
  customFields?: Record<string, any>
): Promise<{ success: boolean; recordId?: string; error?: string }> {
  try {
    await connectToDatabase();

    // Get integration config
    const config = await IntegrationConfig.findOne({
      customerId: auth.customerId,
      integrationKey,
      objectType,
    });

    if (!config || !config.enabled) {
      return { success: false, error: 'Integration not enabled' };
    }

    const membrane = await getMembraneClient(auth);
    const dataCollectionPath = objectType === 'deal' ? 'deals' : 'contacts';

    // Map fields
    const mappedFields = mapFieldsToCRM(nivaRecord, fieldMappings, customFields);
    const computedFields = computeFields(nivaRecord, fieldMappings);

    // Merge all fields
    const finalFields = {
      ...mappedFields,
      ...computedFields,
    };

    // Handle file attachments
    if (nivaRecord.files && Array.isArray(nivaRecord.files)) {
      const fileUrls = nivaRecord.files.map((f: any) => f.url || f).filter(Boolean);
      if (fileUrls.length > 0) {
        const files = await prepareFilesForCRM(fileUrls, auth);
        // Add files to fields (format depends on CRM)
        finalFields.attachments = files;
      }
    }

    // Check if record already exists via data link
    const existingLink = await DataLink.findOne({
      customerId: auth.customerId,
      connectionId,
      dataCollectionPath,
      localRecordId: nivaRecord.id,
    });

    let recordId: string;

    if (existingLink) {
      // Update existing record
      await membrane.dataCollection(dataCollectionPath).update(existingLink.externalRecordId, {
        connectionId,
        fields: finalFields,
      });

      // Update data link
      existingLink.lastSyncedAt = new Date();
      existingLink.syncStatus = 'success';
      await existingLink.save();

      recordId = existingLink.externalRecordId;
    } else {
      // Create new record
      const created = await membrane.dataCollection(dataCollectionPath).create({
        connectionId,
        fields: finalFields,
      });

      recordId = created.id || created.objectId || String(created);

      // Create data link
      await DataLink.create({
        customerId: auth.customerId,
        connectionId,
        dataCollectionId: `${connectionId}-${dataCollectionPath}`,
        dataCollectionPath,
        localRecordId: nivaRecord.id,
        externalRecordId: recordId,
        integrationKey,
        objectType,
        syncDirection: config.syncDirection,
        lastSyncedAt: new Date(),
        syncStatus: 'success',
      });
    }

    return { success: true, recordId };
  } catch (error) {
    console.error('Error syncing to CRM:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Process Niva event and update global payload
 */
export async function processNivaEvent(
  auth: AuthCustomer,
  event: NivaEventPayload
): Promise<void> {
  await connectToDatabase();

  // Get all enabled integrations for this customer
  const integrations = await IntegrationConfig.find({
    customerId: auth.customerId,
    enabled: true,
  });

  for (const integration of integrations) {
    if (!integration.connectionId) continue;

    // Update global payload with event data
    const globalPayload = integration.globalPayload || {};
    const updatedPayload = {
      ...globalPayload,
      ...event.data,
      lastEventType: event.eventType,
      lastEventAt: new Date().toISOString(),
    };

    integration.globalPayload = updatedPayload;
    integration.lastEventProcessedAt = new Date();
    await integration.save();

    // Get field mappings
    const fieldMappings = await getFieldMappings(
      auth.customerId,
      integration.integrationKey,
      integration.objectType
    );

    // Sync to CRM
    await syncNivaToCRM(
      auth,
      integration.integrationKey,
      integration.objectType,
      integration.connectionId,
      updatedPayload,
      fieldMappings,
      integration.customFields as Record<string, any>
    );
  }
}
