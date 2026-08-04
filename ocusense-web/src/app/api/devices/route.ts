/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// BARIS INI WAJIB ADA: Mematikan cache agresif dari Next.js
export const dynamic = 'force-dynamic'; 

export async function GET() {
  try {
    const devices = await prisma.device.findMany();
    return NextResponse.json({ success: true, data: devices });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal memuat alat' }, { status: 500 });
  }
}