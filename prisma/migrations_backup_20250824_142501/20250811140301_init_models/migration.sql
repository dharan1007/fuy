-- CreateTable
CREATE TABLE "SerendipityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "weekNum" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "packId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SerendipityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SerendipityLog_userId_weekNum_year_key" ON "SerendipityLog"("userId", "weekNum", "year");
