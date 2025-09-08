-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SerendipityLog" (
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
INSERT INTO "new_SerendipityLog" ("completed", "createdAt", "id", "notes", "packId", "userId", "weekNum", "year") SELECT "completed", "createdAt", "id", "notes", "packId", "userId", "weekNum", "year" FROM "SerendipityLog";
DROP TABLE "SerendipityLog";
ALTER TABLE "new_SerendipityLog" RENAME TO "SerendipityLog";
CREATE UNIQUE INDEX "SerendipityLog_userId_weekNum_year_key" ON "SerendipityLog"("userId", "weekNum", "year");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
