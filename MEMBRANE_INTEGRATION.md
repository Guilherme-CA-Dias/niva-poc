# Membrane Data Integration Implementation

This document describes the Membrane integration implementation for Niva's CRM sync functionality.

## Overview

The implementation provides data integration capabilities using Membrane SDK to sync data between Niva and CRM systems (HubSpot and Salesforce). It supports:

- **One-way sync**: Push events from Niva to CRM with upsert logic
- **Two-way sync**: Bidirectional synchronization (for demonstration)
- **Field mapping**: Map Niva's global schema fields to CRM fields
- **Custom fields**: Handle customer-specific custom fields stored as JSON hash
- **File handling**: Send actual files to CRM, not just URLs
- **Field computation**: Compute fields based on other field values (e.g., notes/comments from activities)

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Membrane Workspace Credentials
MEMBRANE_WORKSPACE_KEY=your_workspace_key_here
MEMBRANE_WORKSPACE_SECRET=your_workspace_secret_here
MEMBRANE_CLIENT_KEY=niva-membrane-poc-app
```

You can find these credentials in your Membrane workspace settings.

## Architecture

### Core Components

1. **Membrane Client** (`src/lib/membrane-client.ts`)
   - Handles Membrane SDK client initialization
   - Manages token fetching and client instances

2. **Membrane Token Generation** (`src/lib/membrane-token.ts`)
   - Generates JWT tokens for Membrane API authentication
   - Uses customer ID and name to identify requests

3. **Sync Utilities** (`src/lib/membrane-sync.ts`)
   - Field mapping logic
   - Data transformation and computation
   - File handling for CRM uploads
   - Upsert logic for CRM records

### Data Models

1. **FieldMapping** (`src/models/field-mapping.ts`)
   - Stores mappings between Niva fields and CRM fields
   - Supports custom fields and field computation rules

2. **DataLink** (`src/models/data-link.ts`)
   - Tracks relationships between Niva records and CRM records
   - Maintains sync status and direction

3. **IntegrationConfig** (`src/models/integration-config.ts`)
   - Stores integration configuration per customer
   - Manages custom fields and global payload state

### API Routes

1. **`/api/membrane-token`** - Generate Membrane JWT tokens
2. **`/api/membrane/data-collections`** - CRUD operations for data collections
3. **`/api/membrane/field-mappings`** - Manage field mappings
4. **`/api/membrane/data-links`** - Manage data links between records
5. **`/api/membrane/integrations`** - Manage integration configurations
6. **`/api/membrane/sync`** - Webhook endpoint for Niva events

### UI Components

1. **CRM Integrations Page** (`/membrane-integrations`)
   - List and configure HubSpot/Salesforce integrations
   - Enable/disable integrations
   - Configure sync direction (one-way/two-way)

2. **Field Mapping Modal**
   - Map Niva fields to CRM fields
   - Add/remove field mappings
   - Handle custom fields

3. **Integration Config Modal**
   - Configure connection IDs
   - Set sync direction
   - Manage custom fields per customer

## Usage

### Setting Up an Integration

1. Navigate to `/membrane-integrations`
2. Click "Setup" for the desired integration (HubSpot/Salesforce) and object type (Deal/Contact)
3. Enter the Membrane connection ID and integration ID
4. Configure sync direction (one-way or two-way)
5. Add custom fields if needed
6. Enable the integration

### Mapping Fields

1. After setting up an integration, click "Map Fields"
2. Add mappings between Niva fields and CRM fields
3. Mark fields as custom if they're customer-specific
4. Save mappings

### Syncing Data

The system automatically syncs data when Niva events are received via the webhook endpoint:

```bash
POST /api/membrane/sync
Content-Type: application/json
x-auth-id: <customer-id>
x-customer-name: <customer-name>

{
  "customerId": "customer-123",
  "eventType": "start_submission",
  "data": {
    "id": "submission-456",
    "name": "John Doe",
    "email": "john@example.com",
    "amount": 50000,
    "files": ["https://example.com/file.pdf"],
    "activities": [
      {
        "type": "comment",
        "description": "Initial review",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  }
}
```

### Event Types

The system supports the following event types:
- `start_submission` - When a submission starts
- `upload_documents` - When documents are uploaded
- `upload_contract` - When a contract is uploaded
- `approved` - When submission is approved
- `rejected` - When submission is rejected
- `manual_review` - When submission requires manual review

## Features

### Upsert Logic

The sync process uses upsert logic:
- If a record doesn't exist in CRM, it creates a new one
- If a record exists (tracked via DataLink), it updates the existing record
- Data links maintain the relationship between Niva records and CRM records

### Global Payload

Multiple events are condensed into a single global payload:
- Each event updates the global payload with new data
- The global payload is synced to CRM
- This ensures all event data is included in the final CRM record

### File Handling

Files are handled specially:
- File URLs are downloaded
- Files are converted to buffers
- Files are sent to CRM as attachments (format depends on CRM)

### Field Computation

Fields can be computed from other fields:
- Example: Notes/comments field computed from activities
- Activities are sorted by timestamp
- Computed into a formatted notes field

## Testing

To test the integration:

1. Set up environment variables
2. Configure an integration in the UI
3. Map some fields
4. Send a test event to `/api/membrane/sync`
5. Check the CRM to verify the record was created/updated

## Next Steps

- [ ] Add support for two-way sync webhooks from CRM
- [ ] Implement field computation UI
- [ ] Add sync status monitoring
- [ ] Add error handling and retry logic
- [ ] Add sync history/logs
