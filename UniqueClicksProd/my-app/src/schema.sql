CREATE TABLE "Url" (
  "id" UUID PRIMARY KEY,
  "shortId" VARCHAR(255) NOT NULL UNIQUE,
  "originalUrl" TEXT NOT NULL,
  "totalClicks" INTEGER NOT NULL DEFAULT 0,
  "uniqueClicks" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create index as a separate statement
CREATE INDEX "shortId_idx" ON "Url" ("shortId");

CREATE TABLE "Visitor" (
  "id" UUID PRIMARY KEY,
  "visitorId" VARCHAR(255) NOT NULL,
  "city" VARCHAR(255),
  "urlId" UUID NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("urlId") REFERENCES "Url" ("id") ON DELETE CASCADE,
  UNIQUE ("urlId", "visitorId")
);

-- Additional indexes for the Visitor table
CREATE INDEX "visitor_urlId_idx" ON "Visitor" ("urlId");
CREATE INDEX "visitor_visitorId_idx" ON "Visitor" ("visitorId");