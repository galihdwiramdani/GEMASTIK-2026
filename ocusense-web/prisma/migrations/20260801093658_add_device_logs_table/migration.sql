-- CreateTable
CREATE TABLE "device_logs" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "device_logs_pkey" PRIMARY KEY ("id")
);
