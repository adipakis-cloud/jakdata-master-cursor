-- CreateTable
CREATE TABLE "ai_alerts" (
    "id" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "wilayahScope" TEXT NOT NULL,
    "wilayahId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_scores" (
    "id" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signals" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_decisions" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "decisionType" TEXT NOT NULL,
    "inputSnapshot" JSONB NOT NULL,
    "outputResult" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fraudScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "urgencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_engine_recommendations" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetWilayahId" TEXT,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "isActed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_engine_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "territorial_health_scores" (
    "id" TEXT NOT NULL,
    "wilayahType" TEXT NOT NULL,
    "wilayahId" TEXT NOT NULL,
    "socialScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "economicScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "operationalScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "breakdown" JSONB NOT NULL,
    "period" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "territorial_health_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economic_snapshots" (
    "id" TEXT NOT NULL,
    "warmindoId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "debtTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "topItems" JSONB NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "economic_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "economic_alerts" (
    "id" TEXT NOT NULL,
    "warmindoId" TEXT,
    "wilayahId" TEXT,
    "alertType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "economic_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "body" TEXT,
    "aiProcessed" BOOLEAN NOT NULL DEFAULT false,
    "aiReply" TEXT,
    "laporanId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "qrCode" TEXT,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_alerts_severity_isResolved_idx" ON "ai_alerts"("severity", "isResolved");

-- CreateIndex
CREATE INDEX "ai_alerts_createdAt_idx" ON "ai_alerts"("createdAt");

-- CreateIndex
CREATE INDEX "fraud_scores_score_idx" ON "fraud_scores"("score");

-- CreateIndex
CREATE UNIQUE INDEX "fraud_scores_subjectType_subjectId_key" ON "fraud_scores"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "ai_decisions_entityType_entityId_idx" ON "ai_decisions"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ai_engine_recommendations_priority_isActed_idx" ON "ai_engine_recommendations"("priority", "isActed");

-- CreateIndex
CREATE UNIQUE INDEX "territorial_health_scores_wilayahType_wilayahId_period_key" ON "territorial_health_scores"("wilayahType", "wilayahId", "period");

-- CreateIndex
CREATE INDEX "economic_snapshots_warmindoId_period_idx" ON "economic_snapshots"("warmindoId", "period");

-- CreateIndex
CREATE INDEX "whatsapp_messages_from_receivedAt_idx" ON "whatsapp_messages"("from", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_sessionKey_key" ON "whatsapp_sessions"("sessionKey");
