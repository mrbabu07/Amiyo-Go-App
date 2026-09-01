ALTER TABLE "platform_configurations"
ADD COLUMN "village_operations" JSONB NOT NULL DEFAULT '{}'::jsonb;
