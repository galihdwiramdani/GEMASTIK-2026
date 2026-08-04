/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const { id } = await params;

    const record = await prisma.medicalRecord.findUnique({
      where: { scanId: id },
      include: { device: true }
    });
    
    if (!record) return NextResponse.json({ success: false, error: 'Data tidak ditemukan' }, { status: 404 });

    // 🟢 ISOLASI: Jika alat lain mencoba buka URL PDF ini, TOLAK MENTAH-MENTAH!
    if (record.deviceId !== deviceId) {
      return NextResponse.json({ success: false, error: 'Akses Ilegal: Anda tidak berhak melihat data ini!' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}