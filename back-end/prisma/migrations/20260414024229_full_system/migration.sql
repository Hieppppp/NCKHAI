/*
  Warnings:

  - You are about to drop the column `author` on the `ScientificWork` table. All the data in the column will be lost.
  - Added the required column `authors` to the `ScientificWork` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'OUTLINE_REVIEW', 'PROPOSAL_REVIEW', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'ACCEPTED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkLevel" AS ENUM ('UNIVERSITY', 'MINISTRY', 'STATE');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('JOURNAL_ARTICLE', 'CONFERENCE_PAPER', 'RESEARCH_PROJECT', 'PATENT', 'TEXTBOOK', 'THESIS');

-- CreateEnum
CREATE TYPE "FileCategory" AS ENUM ('MANUSCRIPT', 'PROPOSAL', 'REPORT', 'REVIEW_FORM', 'CERTIFICATE', 'ATTACHMENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('WORKFLOW', 'COMMITTEE', 'DEADLINE', 'SYSTEM');

-- AlterTable
ALTER TABLE "ScientificWork" DROP COLUMN "author",
ADD COLUMN     "aiKeywords" TEXT[],
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "authors" TEXT NOT NULL,
ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "doi" TEXT,
ADD COLUMN     "issn" TEXT,
ADD COLUMN     "journalName" TEXT,
ADD COLUMN     "keywords" TEXT[],
ADD COLUMN     "level" "WorkLevel" NOT NULL DEFAULT 'UNIVERSITY',
ADD COLUMN     "publishedDate" TIMESTAMP(3),
ADD COLUMN     "researchHours" DOUBLE PRECISION,
ADD COLUMN     "similarityScore" DOUBLE PRECISION,
ADD COLUMN     "status" "WorkStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "type" "WorkType" NOT NULL DEFAULT 'RESEARCH_PROJECT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "specialization" TEXT;

-- CreateTable
CREATE TABLE "WorkflowStep" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "status" "WorkStatus" NOT NULL,
    "comment" TEXT,
    "completedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workId" INTEGER NOT NULL,

    CONSTRAINT "WorkflowStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Committee" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "meetingDate" TIMESTAMP(3),
    "location" TEXT,
    "finalScore" DOUBLE PRECISION,
    "conclusion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workId" INTEGER NOT NULL,

    CONSTRAINT "Committee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommitteeMember" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committeeId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "CommitteeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" SERIAL NOT NULL,
    "innovationScore" DOUBLE PRECISION,
    "feasibilityScore" DOUBLE PRECISION,
    "impactScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "comment" TEXT,
    "recommendation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workId" INTEGER NOT NULL,
    "reviewerId" INTEGER NOT NULL,
    "committeeId" INTEGER,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileUpload" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "category" "FileCategory" NOT NULL DEFAULT 'MANUSCRIPT',
    "extractedText" TEXT,
    "extractedTitle" TEXT,
    "extractedAuthors" TEXT,
    "extractedAbstract" TEXT,
    "extractedKeywords" TEXT[],
    "ocrConfidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workId" INTEGER,
    "uploaderId" INTEGER NOT NULL,

    CONSTRAINT "FileUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'SYSTEM',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,
    "workId" INTEGER,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommitteeMember_committeeId_userId_key" ON "CommitteeMember"("committeeId", "userId");

-- AddForeignKey
ALTER TABLE "WorkflowStep" ADD CONSTRAINT "WorkflowStep_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ScientificWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Committee" ADD CONSTRAINT "Committee_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ScientificWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMember" ADD CONSTRAINT "CommitteeMember_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitteeMember" ADD CONSTRAINT "CommitteeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ScientificWork"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_committeeId_fkey" FOREIGN KEY ("committeeId") REFERENCES "Committee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ScientificWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileUpload" ADD CONSTRAINT "FileUpload_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_workId_fkey" FOREIGN KEY ("workId") REFERENCES "ScientificWork"("id") ON DELETE SET NULL ON UPDATE CASCADE;
