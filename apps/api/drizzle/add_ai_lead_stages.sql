-- Migration: Add AI pipeline stages to crm_lead_status enum
-- Run this directly in your Neon DB SQL editor
--
-- PostgreSQL enums cannot be removed but new values can be added.
-- These must be added BEFORE the values they precede in the UI pipeline.

-- Add AI stage values to existing enum
ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_ATTEMPTING';
ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_QUALIFIED';
ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_DISQUALIFIED';
ALTER TYPE "crm_lead_status" ADD VALUE IF NOT EXISTS 'AI_UNREACHED';

-- Verify the enum now contains all values
SELECT unnest(enum_range(NULL::crm_lead_status)) AS status_values;
