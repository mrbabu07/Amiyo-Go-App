CREATE TABLE "media_uploads" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "purpose" TEXT NOT NULL,
  "visibility" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "expected_size" INTEGER NOT NULL,
  "uploaded_size" INTEGER,
  "checksum" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "error_code" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "media_uploads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "media_uploads_storage_key_key" ON "media_uploads"("storage_key");
CREATE INDEX "media_uploads_user_id_status_created_at_idx" ON "media_uploads"("user_id", "status", "created_at");
