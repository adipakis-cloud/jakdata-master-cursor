-- CreateTable
CREATE TABLE "field_evidence" (
    "id" SERIAL NOT NULL,
    "uuid" TEXT NOT NULL,
    "action_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50),
    "entity_id" INTEGER,
    "photo_url" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "note" TEXT,
    "user_id" INTEGER,
    "rt_id" INTEGER,
    "rw_id" INTEGER,
    "kelurahan_id" INTEGER,
    "warmindo_id" INTEGER,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "field_evidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "field_evidence_uuid_key" ON "field_evidence"("uuid");

-- CreateIndex
CREATE INDEX "field_evidence_action_type_idx" ON "field_evidence"("action_type");

-- CreateIndex
CREATE INDEX "field_evidence_entity_type_entity_id_idx" ON "field_evidence"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "field_evidence_user_id_idx" ON "field_evidence"("user_id");

-- CreateIndex
CREATE INDEX "field_evidence_rt_id_idx" ON "field_evidence"("rt_id");

-- CreateIndex
CREATE INDEX "field_evidence_warmindo_id_idx" ON "field_evidence"("warmindo_id");

-- CreateIndex
CREATE INDEX "field_evidence_captured_at_idx" ON "field_evidence"("captured_at" DESC);
