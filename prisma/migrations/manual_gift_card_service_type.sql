-- Migration: Add GIFT_CARD to ServiceType enum (2026-07-10)
ALTER TYPE "ServiceType" ADD VALUE IF NOT EXISTS 'GIFT_CARD';
