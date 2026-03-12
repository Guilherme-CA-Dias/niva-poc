import mongoose from 'mongoose';

export interface IDataLink {
  customerId: string;
  connectionId: string;
  dataCollectionId: string;
  dataCollectionPath: string; // e.g., 'contacts' or 'deals'
  localRecordId: string; // Niva record ID
  externalRecordId: string; // CRM record ID
  integrationKey: string; // 'hubspot' or 'salesforce'
  objectType: 'deal' | 'contact';
  syncDirection: 'one-way' | 'two-way';
  lastSyncedAt?: Date;
  syncStatus?: 'success' | 'error' | 'pending';
  syncError?: string;
}

const dataLinkSchema = new mongoose.Schema<IDataLink>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    connectionId: {
      type: String,
      required: true,
      index: true,
    },
    dataCollectionId: {
      type: String,
      required: true,
    },
    dataCollectionPath: {
      type: String,
      required: true,
    },
    localRecordId: {
      type: String,
      required: true,
      index: true,
    },
    externalRecordId: {
      type: String,
      required: true,
    },
    integrationKey: {
      type: String,
      required: true,
      enum: ['hubspot', 'salesforce'],
    },
    objectType: {
      type: String,
      required: true,
      enum: ['deal', 'contact'],
    },
    syncDirection: {
      type: String,
      required: true,
      enum: ['one-way', 'two-way'],
      default: 'one-way',
    },
    lastSyncedAt: {
      type: Date,
    },
    syncStatus: {
      type: String,
      enum: ['success', 'error', 'pending'],
      default: 'pending',
    },
    syncError: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
dataLinkSchema.index({ customerId: 1, localRecordId: 1 });
dataLinkSchema.index({ connectionId: 1, externalRecordId: 1 });
dataLinkSchema.index({ customerId: 1, integrationKey: 1, objectType: 1 });

export const DataLink =
  mongoose.models.DataLink || mongoose.model<IDataLink>('DataLink', dataLinkSchema);
