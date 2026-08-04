-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "battery_percentage" DOUBLE PRECISION NOT NULL,
    "latency_ms" DOUBLE PRECISION NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "bounding_box" DOUBLE PRECISION[],
    "validation_status" TEXT NOT NULL DEFAULT 'pending',
    "doctor_notes" TEXT,
    "referral_issued" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_scan_id_key" ON "medical_records"("scan_id");
