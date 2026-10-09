-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STAFF');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('LOST', 'FOUND');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'ACTIVE', 'POSSIBLE_MATCH', 'CLAIM_PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'HANDOVER_PENDING', 'RETURNED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SUGGESTED', 'DISMISSED', 'ACCEPTED_FOR_REVIEW', 'CLOSED');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('SUBMITTED', 'NEEDS_MORE_INFO', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN', 'CLOSED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemReport" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "eventOccurredAt" TIMESTAMP(3),
    "publicDescription" TEXT,
    "privateDetails" TEXT,
    "identifier" TEXT,
    "imageRef" TEXT,
    "shareRef" TEXT,
    "reporterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "lostReportId" TEXT NOT NULL,
    "foundReportId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reasons" JSONB NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Claim" (
    "id" TEXT NOT NULL,
    "claimantId" TEXT NOT NULL,
    "foundReportId" TEXT,
    "matchId" TEXT,
    "message" TEXT,
    "evidence" TEXT,
    "proofRef" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseEvent" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "claimId" TEXT,
    "actorId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemReport_shareRef_key" ON "ItemReport"("shareRef");

-- CreateIndex
CREATE INDEX "ItemReport_type_status_idx" ON "ItemReport"("type", "status");

-- CreateIndex
CREATE INDEX "ItemReport_category_idx" ON "ItemReport"("category");

-- CreateIndex
CREATE INDEX "ItemReport_location_idx" ON "ItemReport"("location");

-- CreateIndex
CREATE INDEX "ItemReport_eventOccurredAt_idx" ON "ItemReport"("eventOccurredAt");

-- CreateIndex
CREATE INDEX "ItemReport_reporterId_idx" ON "ItemReport"("reporterId");

-- CreateIndex
CREATE INDEX "ItemReport_createdAt_idx" ON "ItemReport"("createdAt");

-- CreateIndex
CREATE INDEX "ItemReport_title_idx" ON "ItemReport"("title");

-- CreateIndex
CREATE INDEX "ItemReport_identifier_idx" ON "ItemReport"("identifier");

-- CreateIndex
CREATE INDEX "Match_status_score_idx" ON "Match"("status", "score");

-- CreateIndex
CREATE INDEX "Match_createdAt_idx" ON "Match"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Match_lostReportId_foundReportId_key" ON "Match"("lostReportId", "foundReportId");

-- CreateIndex
CREATE INDEX "Claim_claimantId_status_idx" ON "Claim"("claimantId", "status");

-- CreateIndex
CREATE INDEX "Claim_foundReportId_idx" ON "Claim"("foundReportId");

-- CreateIndex
CREATE INDEX "Claim_matchId_idx" ON "Claim"("matchId");

-- CreateIndex
CREATE INDEX "Claim_status_createdAt_idx" ON "Claim"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "CaseEvent_reportId_createdAt_idx" ON "CaseEvent"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_claimId_createdAt_idx" ON "CaseEvent"("claimId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_actorId_createdAt_idx" ON "CaseEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "CaseEvent_eventType_createdAt_idx" ON "CaseEvent"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "ItemReport" ADD CONSTRAINT "ItemReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_lostReportId_fkey" FOREIGN KEY ("lostReportId") REFERENCES "ItemReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_foundReportId_fkey" FOREIGN KEY ("foundReportId") REFERENCES "ItemReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_claimantId_fkey" FOREIGN KEY ("claimantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_foundReportId_fkey" FOREIGN KEY ("foundReportId") REFERENCES "ItemReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Claim" ADD CONSTRAINT "Claim_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ItemReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseEvent" ADD CONSTRAINT "CaseEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
