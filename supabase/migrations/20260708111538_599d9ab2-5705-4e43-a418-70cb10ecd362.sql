
-- =========================================================
-- SELFPACED MODULE - Phase 1 Foundation
-- =========================================================

-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sp_student';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sp_admin';
