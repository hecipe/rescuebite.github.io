-- 001_extensions.sql
-- Enable required PostgreSQL extensions

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "moddatetime";
-- pg_cron may not be available on all tiers; handled gracefully in 007_cron.sql
-- create extension if not exists "pg_cron";
