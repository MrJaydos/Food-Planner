-- CreateTable
CREATE TABLE "ideas" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "url" TEXT,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "convertedRecipeId" TEXT,
    "createdByMembershipId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ideas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ideas_householdId_done_idx" ON "ideas"("householdId", "done");

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_convertedRecipeId_fkey" FOREIGN KEY ("convertedRecipeId") REFERENCES "recipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_createdByMembershipId_fkey" FOREIGN KEY ("createdByMembershipId") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;
