/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import mqtt from 'mqtt';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic'; 

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Trik Next.js 15: Ekstrak ID dengan await
    const { id } = await params;
    
    const device = await prisma.device.findUnique({ where: { id: id } });
    if (!device) return NextResponse.json({ success: false, error: 'Alat tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ success: true, data: device });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Kesalahan Server' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updatedDevice = await prisma.device.update({
      where: { id: id },
      data: {
        alertPhone: body.alertPhone !== undefined ? body.alertPhone : undefined,
        alertEmail: body.alertEmail !== undefined ? body.alertEmail : undefined,
        operatorName: body.operatorName !== undefined ? body.operatorName : undefined,
        operatorDob: body.operatorDob !== undefined ? new Date(body.operatorDob) : undefined,
      }
    });

    if (updatedDevice.operatorName) {
      const mqttClient = mqtt.connect('mqtt://localhost:1883');
      mqttClient.on('connect', () => {
        const payload = JSON.stringify({ status: "success", operator: updatedDevice.operatorName });
        mqttClient.publish(`ocusense/paired/${updatedDevice.macAddress}`, payload, { qos: 1 }, () => {
          mqttClient.end(false); 
        });
      });
    }
    
    return NextResponse.json({ success: true, data: updatedDevice });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal memperbarui alat' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    await prisma.medicalRecord.updateMany({
      where: { deviceId: id },
      data: { deviceId: null }
    });
    
    await prisma.device.delete({ where: { id: id } });
    return NextResponse.json({ success: true, message: 'Alat dihapus!' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Gagal menghapus alat' }, { status: 500 });
  }
}