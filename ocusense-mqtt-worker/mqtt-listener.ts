import { PrismaClient } from '@prisma/client';
import mqtt from 'mqtt';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();
const client = mqtt.connect('mqtt://localhost:1883');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

client.on('connect', () => {
  console.log('\n======================================================');
  console.log('✅ 📡 MQTT LISTENER AKTIF & SIAP MENERIMA DATA');
  console.log('======================================================\n');
  client.subscribe('ocusense/register');
  client.subscribe('ocusense/scans');
});

client.on('message', async (topic, message) => {
  try {
    const payload = JSON.parse(message.toString());

    if (topic === 'ocusense/register') {
      const device = await prisma.device.upsert({
        where: { macAddress: payload.mac_address },
        update: { name: payload.device_name, pairingCode: payload.pairing_code },
        create: { macAddress: payload.mac_address, name: payload.device_name, pairingCode: payload.pairing_code }
      });
      if (device.operatorName) {
        client.publish(`ocusense/paired/${device.macAddress}`, JSON.stringify({ status: "success", operator: device.operatorName }));
      }
      return; 
    }

    if (topic === 'ocusense/scans') {
      console.log(`📥 [DATA MASUK] Pindaian baru diterima: #${payload.scan_id}`);

      const device = await prisma.device.findUnique({ where: { macAddress: payload.mac_address } });
      if(!device) return;

      const patientName = device.operatorName || "Data Pasien Tidak Diketahui";
      const patientDob = device.operatorDob ? new Date(device.operatorDob) : new Date();
      
      let calculatedAge = 0;
      if (device.operatorDob) {
        calculatedAge = new Date().getFullYear() - patientDob.getFullYear();
      }

      try {
        await prisma.medicalRecord.create({
          data: {
            scanId: payload.scan_id,
            patientName: patientName,
            patientDob: patientDob,
            patientAge: calculatedAge,
            timestamp: new Date(payload.timestamp),
            batteryPercentage: 100,
            latencyMs: 5.0,
            diagnosis: payload.ai_analysis.diagnosis,
            confidenceScore: payload.ai_analysis.confidence_score,
            boundingBox: payload.ai_analysis.bounding_box,
            image: payload.image,
            deviceId: device.id
          },
        });
      } catch (dbError) {
        console.error("❌ Gagal menyimpan ke Database:", dbError);
        return; 
      }

      const scanTime = new Date(payload.timestamp).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
      const dobFormatted = patientDob.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const isMatur = payload.ai_analysis.diagnosis === "Katarak Matur";
      const handlingStatus = isMatur ? 'PERLU RUJUKAN BEDAH SEGERA' : 'BATAS AMAN / OBSERVASI KLINIS';
      const colorTheme = isMatur ? "#dc2626" : payload.ai_analysis.diagnosis === "Katarak Imatur" ? "#ea580c" : "#059669";

      // 🟢 TRIK EMAIL: KALKULASI GRID TABEL PIXEL-PERFECT (Untuk Mengganti Absolute Positioning)
      const bbox = payload.ai_analysis.bounding_box;
      const x = Math.round(bbox[0]);
      const y = Math.round(bbox[1]);
      const w = Math.round(bbox[2] - bbox[0]);
      const h = Math.round(bbox[3] - bbox[1]);

      if (device.alertEmail) {
        const htmlTemplate = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
          </head>
          <body style="margin: 0; padding: 20px; background-color: #f8fafc; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
            
            <div style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);">
              
              <!-- HEADER KLINIS -->
              <div style="background-color: #ffffff; padding: 35px 35px 25px 35px; text-align: left; border-bottom: 1px solid #f1f5f9; border-top: 6px solid #2563eb;">
                <p style="color: #2563eb; margin: 0 0 8px 0; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">Departemen Oftalmologi</p>
                <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Rekam Medis Elektronik</h1>
                <p style="color: #64748b; margin: 6px 0 0 0; font-size: 13px; font-weight: 500;">Sistem Skrining Presisi &bull; Ocusense AI</p>
              </div>
              
              <div style="padding: 30px 35px 40px 35px;">
                
                <!-- DATA PASIEN & INSTRUMEN -->
                <h3 style="color: #0f172a; font-size: 11px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Informasi Pasien & Pindai</h3>
                
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 35px; font-size: 14px; background-color: #f8fafc; border-radius: 12px; overflow: hidden;">
                  <tr>
                    <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; width: 40%; font-weight: 500;">Nama Lengkap</td>
                    <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 800; text-align: right;">${patientName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">Usia & Tanggal Lahir</td>
                    <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 700; text-align: right;">${calculatedAge} Tahun (${dobFormatted})</td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #64748b; font-weight: 500;">Tanggal & Waktu Periksa</td>
                    <td style="padding: 15px 20px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-weight: 700; text-align: right;">${scanTime} WIB</td>
                  </tr>
                  <tr>
                    <td style="padding: 15px 20px; color: #64748b; font-weight: 500;">Instrumen Tepi (Edge)</td>
                    <td style="padding: 15px 20px; color: #0f172a; font-weight: 700; text-align: right;">${device.name}</td>
                  </tr>
                </table>

                <!-- KESIMPULAN DIAGNOSIS -->
                <h3 style="color: #0f172a; font-size: 11px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Kesimpulan Analisis Klinis</h3>
                
                <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 40px; background-color: #ffffff; box-shadow: 0 2px 10px rgba(0,0,0,0.01);">
                  <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Diagnosis Primer</p>
                  <h2 style="margin: 0 0 20px 0; color: ${colorTheme}; font-size: 26px; font-weight: 800; text-transform: uppercase; letter-spacing: -0.5px;">${payload.ai_analysis.diagnosis}</h2>
                  
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
                    <tr>
                      <td style="padding: 15px 0 5px 0; color: #64748b; font-weight: 500;">Akurasi Inferensi (AI Confidence)</td>
                      <td style="padding: 15px 0 5px 0; color: #0f172a; font-weight: 800; font-size: 16px; text-align: right;">${payload.ai_analysis.confidence_score}%</td>
                    </tr>
                    <tr>
                      <td style="padding: 5px 0 0 0; color: #64748b; font-weight: 500;">Rekomendasi Tindakan Lanjutan</td>
                      <td style="padding: 5px 0 0 0; color: #0f172a; font-weight: 700; text-align: right;">${handlingStatus}</td>
                    </tr>
                  </table>
                </div>

                <!-- CITRA MEDIS -->
                <h3 style="color: #0f172a; font-size: 11px; margin-top: 0; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 800;">Lampiran Visual Medis (YOLOv8 Edge)</h3>
                
                <!-- 🟢 STRUKTUR TABEL GRID AMAN EMAIL (CLONING DASBOR) -->
                <div style="background-color: #0f172a; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 30px; width: 100%; max-width: 640px; margin-left: auto; margin-right: auto; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                  
                  <table background="cid:scanImage" width="100%" height="480" cellpadding="0" cellspacing="0" border="0" style="background-image: url('cid:scanImage'); background-size: cover; background-position: center; width: 100%; height: 480px; max-width: 640px; border-collapse: collapse;">
                    <!-- BARIS 1: Spasi Kosong Atas -->
                    <tr>
                      <td width="${x}" height="${y}"></td>
                      <td width="${w}" height="${y}"></td>
                      <td width="${640 - x - w}" height="${y}"></td>
                    </tr>
                    <!-- BARIS 2: Kotak Bounding Box YOLO -->
                    <tr>
                      <td width="${x}" height="${h}"></td>
                      <td width="${w}" height="${h}" style="border: 2px solid ${colorTheme}; vertical-align: top; background-color: rgba(255,255,255,0.05);">
                         <div style="background-color: ${colorTheme}; color: #ffffff; font-size: 10px; font-weight: 800; letter-spacing: 1px; display: inline-block; padding: 6px 10px; border-bottom-right-radius: 8px;">AI : ${payload.ai_analysis.confidence_score}%</div>
                      </td>
                      <td width="${640 - x - w}" height="${h}"></td>
                    </tr>
                    <!-- BARIS 3: Spasi Kosong Bawah -->
                    <tr>
                      <td width="${x}" height="${480 - y - h}"></td>
                      <td width="${w}" height="${480 - y - h}"></td>
                      <td width="${640 - x - w}" height="${480 - y - h}"></td>
                    </tr>
                  </table>

                </div>

                <!-- FOOTER -->
                <div style="border-top: 1px solid #e2e8f0; padding-top: 25px; text-align: center;">
                  <p style="font-size: 11px; color: #94a3b8; line-height: 1.7; margin: 0; font-weight: 500;">
                    Dokumen elektronik ini digenerasi secara otonom oleh komputasi tepi Ocusense AI.<br/>
                    Laporan ini dirancang eksklusif sebagai instrumen penunjang skrining awal klinis, bukan vonis diagnosis mutlak.<br/>
                    Harap selalu konsultasikan hasil ini kepada Dokter Spesialis Mata (Sp.M).
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: '"Departemen Diagnostik Ocusense" <no-reply@ocusense.id>',
          to: device.alertEmail,
          subject: `Laporan Medis [${payload.scan_id}] - ${patientName}`,
          html: htmlTemplate,
          attachments: [{ filename: `Citra_${payload.scan_id}.jpg`, content: payload.image, encoding: 'base64', cid: 'scanImage' }]
        });
      }
    }
  } catch (error) {
    console.error('❌ Galat MQTT Utama:', error);
  }
});