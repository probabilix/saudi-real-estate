-- ──────────────────────────────────────────────────────────────────────────
-- Migration: 0010_add_map_coordinates.sql
-- Adds lat/lng to projects table (listings already has them).
-- Adds a composite index on listings(lat, lng) for fast bounding-box queries.
-- ──────────────────────────────────────────────────────────────────────────

-- 1. Add lat/lng columns to projects
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS "lng" DECIMAL(10, 7);

-- 2. Fast bounding-box index for the map viewport API on listings
--    (standalone listings only — project layouts are excluded at query time)
CREATE INDEX IF NOT EXISTS "listings_lat_lng_idx"
  ON "listings" ("lat", "lng")
  WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL;

-- 3. Same index for projects
CREATE INDEX IF NOT EXISTS "projects_lat_lng_idx"
  ON "projects" ("lat", "lng")
  WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL;
