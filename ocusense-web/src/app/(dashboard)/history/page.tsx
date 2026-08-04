/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import 'dayjs/locale/id';

dayjs.locale('id');

export default function HistoryPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deviceName, setDeviceName] = useState("Memuat...");

  useEffect(() => {
    const fetchFreshData = async () => {
      if (typeof window === "undefined") return;
      const activeDeviceId = localStorage.getItem("active_device_id");
      
      if (!activeDeviceId) {
        setDeviceName("Tidak ada alat");
        setIsLoading(false);
        return;
      }

      try {
        // PENGHANCUR CACHE: Tambahkan Date.now() agar selalu Live!
        const resDevice = await fetch(`/api/devices/${activeDeviceId}?t=${Date.now()}`, { cache: 'no-store' });
        const dataDevice = await resDevice.json();
        if (dataDevice.success) setDeviceName(dataDevice.data.name);

        const resRecords = await fetch(`/api/records?t=${Date.now()}&deviceId=${activeDeviceId}`, { cache: 'no-store' });
        const dataRecords = await resRecords.json();
        
        if (dataRecords.success) {
          const deviceRecords = dataRecords.data.filter((item: any) => item.deviceId === activeDeviceId);
          setRecords(deviceRecords.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        }
      } catch (error) {
        console.error("Gagal menarik data baru");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFreshData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 w-full pb-12 font-sans text-slate-900">
      
      {/* HEADER HALAMAN */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Rekam Medis</h2>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">Riwayat laporan hasil pindai telemetri (Live).</p>
        </div>
        
        <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full md:w-auto flex items-center justify-between gap-5 transition-all hover:border-blue-200">
          <div>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Instrumen Terhubung</p>
            <p className="font-bold text-slate-800 text-sm md:text-base tracking-tight truncate max-w-37.5 md:max-w-50">{deviceName}</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
            <i className="ph-duotone ph-cpu text-2xl"></i>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative transition-all">
        
        {isLoading ? (
          // SKELETON LOADING ELEGAN
          <div className="p-6 md:p-10 space-y-6">
            <div className="h-10 bg-slate-50 rounded-xl w-full border border-slate-100 mb-6"></div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex gap-6 items-center px-4">
                <div className="h-12 bg-slate-100 rounded-xl w-12 shrink-0 animate-pulse"></div>
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-1/3 animate-pulse"></div>
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-1/4 animate-pulse"></div>
                <div className="h-12 bg-slate-50 border border-slate-100 rounded-xl w-1/4 animate-pulse"></div>
              </div>
            ))}
          </div>
        ) : records.length === 0 ? (
          
          // STATE KOSONG (TIDAK ADA DATA)
          <div className="py-24 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mb-5 border border-slate-100 shadow-sm text-slate-400">
              <i className="ph-duotone ph-folder-open text-4xl"></i>
            </div>
            <h3 className="text-xl font-extrabold text-slate-800 tracking-tight mb-2">Belum Ada Rekam Medis</h3>
            <p className="text-slate-500 text-sm font-medium max-w-sm">Instrumen ini belum mengirimkan transmisi pemindaian ke basis data server.</p>
          </div>
          
        ) : (
          
          // TABEL DATA RESPONSIF & KLINIS
          <div className="overflow-x-auto w-full custom-scrollbar">
            <table className="w-full text-left min-w-175 border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] md:text-xs uppercase tracking-widest text-slate-400 font-bold">
                  <th className="px-8 py-6 rounded-tl-4xl">Profil Pasien</th>
                  <th className="px-6 py-6">Waktu Terekam</th>
                  <th className="px-6 py-6">Kesimpulan Klinis (AI)</th>
                  <th className="px-8 py-6 text-right rounded-tr-4xl">Tindakan Tambahan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors group">
                    
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          <i className="ph-duotone ph-user text-xl"></i>
                        </div>
                        <div>
                          <p className="font-extrabold tracking-tight text-slate-900 text-sm md:text-base">{record.patientName || "Pasien Anonim"}</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">{record.patientAge ? `Usia Pemeriksaan: ${record.patientAge} Tahun` : "Usia Tidak Diketahui"}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-5">
                      <p className="font-bold text-slate-800">{dayjs(record.timestamp).format('DD MMM YYYY')}</p>
                      <p className="text-xs text-slate-500 font-medium font-mono mt-0.5">{dayjs(record.timestamp).format('HH:mm:ss')} WIB</p>
                    </td>
                    
                    <td className="px-6 py-5">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className={`inline-flex items-center gap-2 font-bold px-3.5 py-1.5 rounded-xl text-xs md:text-sm border shadow-[0_2px_8px_rgba(0,0,0,0.02)] ${record.diagnosis === "Katarak Matur" ? "bg-red-50 text-red-700 border-red-200" : record.diagnosis === "Katarak Imatur" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                          <span className={`w-2 h-2 rounded-full ${record.diagnosis === "Katarak Matur" ? "bg-red-500 animate-pulse" : record.diagnosis === "Katarak Imatur" ? "bg-orange-500" : "bg-emerald-500"}`}></span>
                          {record.diagnosis}
                        </span>
                        <p className="text-[10px] md:text-[11px] text-slate-500 font-semibold tracking-wide pl-1">
                          Akurasi AI: <span className="text-slate-800 font-bold">{record.confidenceScore}%</span>
                        </p>
                      </div>
                    </td>
                    
                    <td className="px-8 py-5 text-right">
                      <Link href={`/history/${record.scanId}`} className="inline-flex justify-center items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-600 hover:text-blue-700 font-bold px-5 py-2.5 rounded-xl transition-all shadow-[0_2px_8px_rgb(0,0,0,0.02)] w-full md:w-auto text-xs md:text-sm">
                        <i className="ph-duotone ph-printer text-lg"></i> Buka Laporan
                      </Link>
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}