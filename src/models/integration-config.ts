import mongoose from 'mongoose';

export interface IIntegrationConfig {
  customerId: string;
  integrationKey: string; // 'hubspot' or 'salesforce'
  connectionId?: string; // Membrane connection ID
  integrationId?: string; // Membrane integration ID
  objectType: 'deal' | 'contact';
  enabled: boolean;
  syncDirection: 'one-way' | 'two-way';
  customFields?: {
    [key: string]: {
      type: string;
      label: string;
      required?: boolean;
    };
  }; // Custom fields per customer stored as JSON hash
  globalPayload?: {
    [key: string]: any;
  }; // Condensed global payload from multiple events
  lastEventProcessedAt?: Date;
}

const integrationConfigSchema = new mongoose.Schema<IIntegrationConfig>(
  {
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    integrationKey: {
      type: String,
      required: true,
      enum: ['hubspot', 'salesforce'],
    },
    connectionId: {
      type: String,
    },
    integrationId: {
      type: String,
    },
    objectType: {
      type: String,
      required: true,
      enum: ['deal', 'contact'],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    syncDirection: {
      type: String,
      required: true,
      enum: ['one-way', 'two-way'],
      default: 'one-way',
    },
    customFields: {
      type: Map,
      of: {
        type: {
          type: String,
        },
        label: String,
        required: Boolean,
      },
      default: {},
    },
    globalPayload: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    lastEventProcessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
integrationConfigSchema.index({ customerId: 1, integrationKey: 1, objectType: 1 });

export const IntegrationConfig =
  mongoose.models.IntegrationConfig ||
  mongoose.model<IIntegrationConfig>('IntegrationConfig', integrationConfigSchema);
