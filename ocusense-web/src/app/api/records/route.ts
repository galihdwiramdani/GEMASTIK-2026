/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');

    if (!deviceId) return NextResponse.json({ success: false, error: 'Akses Ditolak: ID Alat Ilegal' }, { status: 403 });

    // 🟢 ISOLASI: Tarik HANYA riwayat dari deviceId yang meminta!
    const records = await prisma.medicalRecord.findMany({
      where: { deviceId: deviceId },
      include: { device: true },
      orderBy: { timestamp: 'desc' }
    });
    return NextResponse.json({ success: true, data: records });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal memuat rekam medis' }, { status: 500 });
  }
}