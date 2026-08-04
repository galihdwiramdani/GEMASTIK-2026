/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dayjs from "dayjs";
import 'dayjs/locale/id';

dayjs.locale('id');

export default function LaporanPDFPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (!document.getElementById('html-to-image-script')) {
      const script1 = document.createElement('script');
      script1.id = 'html-to-image-script';
      script1.src = "https://cdnjs.cloudflare.com/ajax/libs/html-to-image/1.11.11/html-to-image.min.js";
      document.head.appendChild(script1);
    }
    if (!document.getElementById('jspdf-script')) {
      const script2 = document.createElement('script');
      script2.id = 'jspdf-script';
      script2.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      document.head.appendChild(script2);
    }

    if (!id) return;
    const activeDeviceId = localStorage.getItem("active_device_id");
    fetch(`/api/records/${id}?deviceId=${activeDeviceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setRecord(data.data);
        setIsLoading(false);
      });
  }, [id]);

  const handleDownloadPDF = async () => {
    setIsDownloading(true);

    // 🟢 TRIK PAMUNGKAS: Membungkam Console (Console Interceptor)
    // Menyembunyikan keluhan "SecurityError cssRules" dari html-to-image yang tidak fatal
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const errorMessage = args.join(' ');
      if (errorMessage.includes('cssRules') || errorMessage.includes('SecurityError') || errorMessage.includes('Error inlining remote css file')) {
        return; // Abaikan pesan peringatan ini
      }
      originalConsoleError(...args); // Biarkan error asli lainnya tetap muncul
    };

    try {
      // @ts-ignore
      const htmlToImage = window.htmlToImage;
      // @ts-ignore
      const jsPDF = window.jspdf?.jsPDF;

      if (!htmlToImage || !jsPDF) {
        alert("Sistem konversi PDF sedang disiapkan. Mohon tunggu beberapa detik dan klik lagi.");
        setIsDownloading(false);
        console.error = originalConsoleError; // Kembalikan console jika dibatalkan
        return;
      }

      const hiddenContainer = document.createElement('div');
      hiddenContainer.style.position = 'absolute';
      hiddenContainer.style.top = '-9999px';
      hiddenContainer.style.left = '-9999px';
      hiddenContainer.style.width = '800px'; 
      hiddenContainer.style.backgroundColor = '#ffffff';
      document.body.appendChild(hiddenContainer);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: [800, 1131] });
      const pagesToPrint = ['pdf-page-1', 'pdf-page-2'];

      for (let i = 0; i < pagesToPrint.length; i++) {
        const originalPage = document.getElementById(pagesToPrint[i]);
        if (!originalPage) continue;

        const clone = originalPage.cloneNode(true) as HTMLElement;
        clone.style.width = '800px';
        clone.style.height = '1131px';
        clone.style.padding = '60px'; 
        clone.style.boxSizing = 'border-box';
        clone.style.backgroundColor = '#ffffff';
        clone.style.borderRadius = '0';
        clone.style.boxShadow = 'none';

        hiddenContainer.appendChild(clone);

        const dataUrl = await htmlToImage.toJpeg(clone, {
          quality: 1.0,
          pixelRatio: 2, 
          backgroundColor: '#ffffff'
        });

        if (i > 0) pdf.addPage([800, 1131], 'portrait');
        pdf.addImage(dataUrl, 'JPEG', 0, 0, 800, 1131);

        hiddenContainer.removeChild(clone);
      }

      pdf.save(`Rekam_Medis_${record.scanId}.pdf`);
      document.body.removeChild(hiddenContainer);

    } catch (error) {
      // Jika terjadi error sistem nyata (bukan sekadar peringatan CSS), tampilkan dengan console asli
      originalConsoleError("Gagal mencetak PDF:", error);
      alert("Terjadi kesalahan sistem saat membuat dokumen PDF.");
    } finally {
      // 🟢 KEMBALIKAN CONSOLE: Buka kembali izin log error pada peramban
      console.error = originalConsoleError;
      setIsDownloading(false);
    }
  };

  if (isLoading || !record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="font-bold text-slate-500 tracking-tight">Memuat Rekam Medis...</p>
      </div>
    );
  }

  const renderYoloBox = (bbox: any, diagnosis: string, confidence: number) => {
    if (!bbox || bbox.length !== 4) return null;
    const CAM_W = 640;
    const CAM_H = 480;
    
    const left = (bbox[0] / CAM_W) * 100;
    const top = (bbox[1] / CAM_H) * 100;
    const width = ((bbox[2] - bbox[0]) / CAM_W) * 100;
    const height = ((bbox[3] - bbox[1]) / CAM_H) * 100;

    let colorHex = diagnosis === "Katarak Matur" ? "#dc2626" : diagnosis === "Katarak Imatur" ? "#ea580c" : "#059669";

    return (
      <div className="absolute rounded-lg flex items-start" 
           style={{ 
             left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
             border: `2px solid ${colorHex}`,
             backgroundColor: `${colorHex}1A`
           }}>
         <span style={{ backgroundColor: colorHex, color: '#ffffff' }} className="text-[10px] font-bold px-3 py-1.5 rounded-br-lg rounded-tl-md whitespace-nowrap tracking-widest shadow-sm">
           AI : {confidence}%
         </span>
      </div>
    );
  };

  const diagColor = record.diagnosis === "Katarak Matur" ? "#dc2626" : record.diagnosis === "Katarak Imatur" ? "#ea580c" : "#059669";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 px-4 md:px-0 font-sans text-slate-900">
      
      {/* KONTROL NAVIGASI (Sembunyi saat cetak) */}
      <div className="flex justify-between items-center bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] print:hidden">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-blue-600 font-bold flex items-center gap-2 transition-colors text-sm md:text-base">
          <i className="ph-bold ph-arrow-left text-lg"></i> Kembali ke Riwayat
        </button>
        <button 
          onClick={handleDownloadPDF} 
          disabled={isDownloading}
          className="bg-blue-600 text-white px-5 md:px-6 py-3 rounded-xl font-bold shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] hover:bg-blue-700 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm md:text-base"
        >
          {isDownloading ? <i className="ph-bold ph-spinner animate-spin text-lg md:text-xl"></i> : <i className="ph-duotone ph-printer text-lg md:text-xl"></i>}
          {isDownloading ? 'Menyusun Laporan...' : 'Cetak Dokumen PDF'}
        </button>
      </div>
          
      {/* HALAMAN PDF 1: REKAM MEDIS & DIAGNOSIS */}
      <div id="pdf-page-1" className="bg-white p-8 md:p-14 border border-slate-100 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col font-sans mb-8 relative overflow-hidden">
        
        {/* Ornamen Header Medis */}
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

        <div className="border-b-2 border-slate-100 pb-8 mb-10 flex justify-between items-end mt-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100">
                <i className="ph-duotone ph-file-text text-2xl"></i>
              </div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest m-0">Departemen Oftalmologi</p>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight m-0">Rekam Medis Elektronik</h1>
            <p className="text-slate-500 mt-2 font-medium text-sm m-0">Sistem Skrining Presisi - Ocusense AI</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 m-0">ID Rujukan Pindai</p>
            <p className="text-xl md:text-2xl font-bold font-mono text-slate-900 m-0 tracking-tight">#{record.scanId}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-10">
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <i className="ph-duotone ph-user text-slate-400 text-lg"></i>
              <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest m-0">Identitas Pasien</h3>
            </div>
            <p className="text-[11px] md:text-sm text-slate-500 mb-1 m-0 font-medium">Nama Lengkap:</p>
            <p className="text-base md:text-xl font-bold text-slate-900 mb-4 m-0 tracking-tight">{record.patientName || "Pasien Anonim"}</p>
            <p className="text-[11px] md:text-sm text-slate-500 mb-1 m-0 font-medium">Usia & Tanggal Pemeriksaan:</p>
            <p className="text-sm md:text-base font-bold text-slate-800 m-0">{record.patientAge ? `${record.patientAge} Tahun` : "Tidak Diketahui"} &bull; {dayjs(record.timestamp).format('DD MMMM YYYY')}</p>
          </div>
          
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2 mb-5">
              <i className="ph-duotone ph-cpu text-slate-400 text-lg"></i>
              <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest m-0">Data Instrumen Asal</h3>
            </div>
            <p className="text-[11px] md:text-sm text-slate-500 mb-1 m-0 font-medium">Stasiun Pemindaian:</p>
            <p className="text-base md:text-xl font-bold text-slate-900 mb-4 m-0 tracking-tight">{record.device?.name || "-"}</p>
            <p className="text-[11px] md:text-sm text-slate-500 mb-1 m-0 font-medium">Alamat Fisik Jaringan (MAC):</p>
            <p className="text-sm md:text-base font-bold text-slate-800 font-mono m-0">{record.device?.macAddress || "-"}</p>
          </div>
        </div>

        <div className="mb-6 border border-slate-100 p-8 rounded-2xl bg-white shadow-[0_2px_12px_rgb(0,0,0,0.02)]">
          <div className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <i className="ph-duotone ph-stethoscope text-slate-400 text-xl"></i>
              <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest m-0">Kesimpulan Diagnosis Artifisial</h3>
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-8 m-0 tracking-tight" style={{ color: diagColor }}>
              {record.diagnosis}
            </h2>
            
            <div className="flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-16 pt-6 border-t border-slate-100">
              <div>
                <p className="text-[11px] md:text-sm text-slate-500 mb-1.5 m-0 font-medium">Akurasi Inferensi (AI Confidence):</p>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900 m-0 tracking-tight">{record.confidenceScore}%</p>
              </div>
              <div>
                <p className="text-[11px] md:text-sm text-slate-500 mb-1.5 m-0 font-medium">Rekomendasi Tindakan Lanjutan:</p>
                <p className="text-lg md:text-xl font-bold text-slate-800 m-0">
                  {record.diagnosis === "Katarak Matur" ? "Segera Rujuk Bedah Phacoemulsification" : record.diagnosis === "Katarak Imatur" ? "Jadwalkan Observasi & Pemeriksaan Lanjutan" : "Kondisi Lensa Mata Normal"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grow min-h-10"></div>

        <div className="text-center text-[10px] md:text-xs text-slate-400 border-t border-slate-100 pt-8 mt-8 m-0 font-medium">
          Halaman 1 dari 2 &bull; Dokumen Elektronik Ocusense AI
        </div>
      </div>

      {/* HALAMAN PDF 2: CITRA MEDIS YOLO */}
      <div id="pdf-page-2" className="bg-white p-8 md:p-14 border border-slate-100 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col font-sans relative overflow-hidden">
        
        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>

        <div className="border-b-2 border-slate-100 pb-8 mb-10 mt-4 flex justify-between items-end">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight m-0">Lampiran Visual Medis</h2>
            <p className="text-slate-500 mt-2 font-medium text-sm m-0">Bukti Pindaian Kornea Lensa</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 m-0">ID Rujukan</p>
            <p className="text-lg md:text-xl font-bold font-mono text-slate-900 m-0 tracking-tight">#{record.scanId}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-5">
          <i className="ph-duotone ph-scan text-slate-400 text-lg"></i>
          <h3 className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest m-0">Lokalisasi Objek Visual (YOLOv8 Edge Vision)</h3>
        </div>
        
        <div 
          className="mb-8 w-full max-w-160 mx-auto bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative flex items-center justify-center"
          style={{ aspectRatio: '640/480' }}
        >
          <img 
            src={`data:image/jpeg;base64,${record.image}`} 
            className="w-full h-full object-contain grayscale opacity-95" 
            style={{ display: 'block' }}
            alt="Scanned Eye Vision" 
          />
          {renderYoloBox(record.boundingBox, record.diagnosis, record.confidenceScore)}
        </div>

        <div className="grow min-h-10"></div>

        <div className="text-center text-[10px] md:text-xs text-slate-400 border-t border-slate-100 pt-8 mt-8 m-0 font-medium leading-relaxed">
          Dokumen elektronik ini dihasilkan secara otonom oleh komputasi tepi (Edge Computing) Ocusense AI.<br/>
          Laporan ini dirancang secara eksklusif sebagai instrumen penunjang skrining awal klinis, bukan vonis diagnosis mutlak.<br/>
          Validasi medis berkelanjutan harus selalu dilakukan oleh Dokter Spesialis Mata (Sp.M).<br/><br/>
          Halaman 2 dari 2 &bull; Dokumen Elektronik Ocusense AI
        </div>
      </div>

    </div>
  );
}