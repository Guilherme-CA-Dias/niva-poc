import mongoose from 'mongoose'

const schemaPropertySchema = new mongoose.Schema({
  type: String,
  title: String,
  format: String,
  enum: { type: [String], required: false },
  default: String
}, {
  _id: false,
  strict: false
})

// Add a pre-save middleware to clean up empty enums
schemaPropertySchema.pre('save', function(next) {
  if (Array.isArray(this.enum) && this.enum.length === 0) {
    this.enum = undefined;
  }
  next();
});

const fieldSchemaSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  recordType: { type: String, required: true }, // 'files', 'folders', etc.
  properties: { type: Map, of: schemaPropertySchema },
  required: [String]
}, {
  timestamps: true
})

// Compound index to ensure unique schema per customer and record type
fieldSchemaSchema.index({ customerId: 1, recordType: 1 }, { unique: true })

export const FieldSchema = mongoose.models.FieldSchema || mongoose.model('FieldSchema', fieldSchemaSchema) 
