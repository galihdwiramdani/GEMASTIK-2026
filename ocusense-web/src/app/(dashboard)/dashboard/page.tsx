/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import 'dayjs/locale/id';
import { useMqttStore } from "@/store/useMqttStore";

dayjs.locale('id');

export default function DashboardPage() {
  const { isConnected, battery, latency, isCharging, latestScanPayload, clearLatestScan } = useMqttStore();
  
  const [device, setDevice] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [clearedScanIds, setClearedScanIds] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, matur: 0, imatur: 0, normal: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedClearedIds = localStorage.getItem("cleared_scans");
      if (savedClearedIds) {
        setClearedScanIds(JSON.parse(savedClearedIds));
      }
    }
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (typeof window === "undefined") return;
      const deviceId = localStorage.getItem("active_device_id");
      if (!deviceId) return setIsLoading(false);

      try {
        const resDevice = await fetch(`/api/devices/${deviceId}?t=${Date.now()}`, { cache: 'no-store' });
        const dataDevice = await resDevice.json();
        if (dataDevice.success) setDevice(dataDevice.data);

        const resRecords = await fetch(`/api/records?t=${Date.now()}&deviceId=${deviceId}`, { cache: 'no-store' });
        const dataRecords = await resRecords.json();
        
        if (dataRecords.success) {
          const sorted = dataRecords.data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRecords(sorted);

          let countMatur = 0, countImatur = 0, countNormal = 0;
          sorted.forEach((r: any) => {
            if (r.diagnosis === "Katarak Matur") countMatur++;
            else if (r.diagnosis === "Katarak Imatur") countImatur++;
            else countNormal++;
          });
          setStats({ total: sorted.length, matur: countMatur, imatur: countImatur, normal: countNormal });
        }
      } catch (error) {
        console.error("Gagal menarik data dashboard");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, [latestScanPayload]);

  const getDisplayScan = () => {
    if (latestScanPayload && latestScanPayload.mac_address === device?.macAddress) {
      if (!clearedScanIds.includes(latestScanPayload.scan_id)) {
        return {
          scanId: latestScanPayload.scan_id,
          timestamp: latestScanPayload.timestamp,
          diagnosis: latestScanPayload.ai_analysis.diagnosis,
          confidenceScore: latestScanPayload.ai_analysis.confidence_score,
          boundingBox: latestScanPayload.ai_analysis.bounding_box,
          image: latestScanPayload.image,
          isLive: true
        };
      }
    }
    const latestDbRecord = records.length > 0 ? records[0] : null;
    if (latestDbRecord && !clearedScanIds.includes(latestDbRecord.scanId)) {
      return {
        scanId: latestDbRecord.scanId,
        timestamp: latestDbRecord.timestamp,
        diagnosis: latestDbRecord.diagnosis,
        confidenceScore: latestDbRecord.confidenceScore,
        boundingBox: latestDbRecord.boundingBox,
        image: latestDbRecord.image,
        isLive: false
      };
    }
    return null;
  };

  const displayScan = getDisplayScan();

  const handleSelesai = () => {
    if (displayScan?.scanId) {
      const updatedClearedIds = [...clearedScanIds, displayScan.scanId];
      setClearedScanIds(updatedClearedIds);
      localStorage.setItem("cleared_scans", JSON.stringify(updatedClearedIds));
    }
    clearLatestScan();
  };

  const renderYoloBox = (bbox: number[], diagnosis: string, confidence: number) => {
    if (!bbox || bbox.length !== 4) return null;
    const CAM_W = 640;
    const CAM_H = 480;
    
    const left = (bbox[0] / CAM_W) * 100;
    const top = (bbox[1] / CAM_H) * 100;
    const width = ((bbox[2] - bbox[0]) / CAM_W) * 100;
    const height = ((bbox[3] - bbox[1]) / CAM_H) * 100;

    let colorHex = diagnosis === "Katarak Matur" ? "#dc2626" : diagnosis === "Katarak Imatur" ? "#ea580c" : "#059669";
    let colorTailwind = diagnosis === "Katarak Matur" ? "bg-red-600" : diagnosis === "Katarak Imatur" ? "bg-orange-600" : "bg-emerald-600";

    return (
      <div className="absolute rounded-lg flex items-start transition-all duration-500" 
           style={{ 
             left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%`,
             border: `2px solid ${colorHex}`,
             backgroundColor: `${colorHex}1A`,
             boxShadow: `0 0 20px ${colorHex}33`
           }}>
         <span className={`${colorTailwind} text-white text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-br-lg rounded-tl-md shadow-md whitespace-nowrap tracking-widest`}>
           AI : {confidence}%
         </span>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 w-full pb-10 font-sans text-slate-800">
      
      {/* KEPALA DASBOR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Pantauan Klinis</h2>
          <p className="text-slate-500 text-sm md:text-base font-medium mt-1">Ringkasan aktivitas pemindaian dan telemetri perangkat medis.</p>
        </div>
        
        <div className="bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full md:w-auto flex items-center justify-between md:justify-end gap-6 transition-all hover:border-blue-200">
          <div>
            <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Status Alat</p>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
              <p className={`font-bold text-sm md:text-base tracking-tight ${isConnected ? 'text-emerald-700' : 'text-red-600'}`}>
                {isConnected ? 'TERHUBUNG' : 'TERPUTUS'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-6 md:space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl border border-slate-200"></div>)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="h-96 bg-slate-100 rounded-4xl lg:col-span-2 border border-slate-200"></div>
            <div className="h-96 bg-slate-100 rounded-4xl lg:col-span-1 border border-slate-200"></div>
          </div>
        </div>
      ) : (
        <>
          {/* KARTU STATISTIK */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group transition-all hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 border border-blue-100 text-blue-600 group-hover:scale-110 transition-transform">
                <i className="ph-duotone ph-files text-2xl"></i>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pindaian</p>
              <h3 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{stats.total}</h3>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group transition-all hover:border-red-200 hover:shadow-[0_8px_30px_rgba(220,38,38,0.08)]">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mb-4 border border-red-100 text-red-600 group-hover:scale-110 transition-transform">
                <i className="ph-duotone ph-warning-circle text-2xl"></i>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Katarak Matur</p>
              <h3 className="text-3xl md:text-4xl font-extrabold text-red-600 tracking-tight">{stats.matur}</h3>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group transition-all hover:border-orange-200 hover:shadow-[0_8px_30px_rgba(234,88,12,0.08)]">
              <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center mb-4 border border-orange-100 text-orange-600 group-hover:scale-110 transition-transform">
                <i className="ph-duotone ph-eye text-2xl"></i>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Katarak Imatur</p>
              <h3 className="text-3xl md:text-4xl font-extrabold text-orange-600 tracking-tight">{stats.imatur}</h3>
            </div>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden group transition-all hover:border-emerald-200 hover:shadow-[0_8px_30px_rgba(16,185,129,0.08)]">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 border border-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                <i className="ph-duotone ph-check-circle text-2xl"></i>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Mata Normal</p>
              <h3 className="text-3xl md:text-4xl font-extrabold text-emerald-600 tracking-tight">{stats.normal}</h3>
            </div>

          </div>

          {/* AREA KONTEN UTAMA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">
            
            {/* PANEL TINJAUAN KLINIS */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8">
              <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <i className="ph-duotone ph-clock"></i>
                  </div>
                  Pindaian Terakhir
                </h3>
                {displayScan?.isLive && (
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    Live Feed
                  </span>
                )}
              </div>

              {!displayScan ? (
                <div className="py-24 text-center border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center">
                  <div className="w-20 h-20 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-center mb-5 text-slate-300">
                    <i className="ph-duotone ph-camera text-4xl"></i>
                  </div>
                  <h4 className="font-bold text-slate-800 text-lg mb-1 tracking-tight">Siap Menerima Data</h4>
                  <p className="text-slate-500 text-sm font-medium">Sistem menunggu transmisi citra dari alat fisik.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  
                  {/* Gambar YOLO */}
                  <div className="w-full md:w-1/2">
                    <div className="relative w-full bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-200 flex items-center justify-center" style={{ aspectRatio: '640/480' }}>
                      <img 
                        src={`data:image/jpeg;base64,${displayScan.image}`} 
                        className="w-full h-full object-cover grayscale opacity-90" 
                        alt="Rekam Medis Mata" 
                      />
                      {renderYoloBox(displayScan.boundingBox, displayScan.diagnosis, displayScan.confidenceScore)}
                    </div>
                  </div>
                  
                  {/* Detail Hasil AI */}
                  <div className="w-full md:w-1/2 flex flex-col h-full justify-between">
                    <div>
                      <div className="mb-6 bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">ID Pindai</p>
                        <p className="font-bold text-slate-900 text-lg md:text-xl tracking-tight mb-3">#{displayScan.scanId}</p>
                        
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Waktu Perekaman</p>
                        <p className="text-sm font-semibold text-slate-700">{dayjs(displayScan.timestamp).format('DD MMMM YYYY, HH:mm:ss')} WIB</p>
                      </div>
                      
                      <div className="mb-8">
                        <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Kesimpulan Diagnostik AI</p>
                        <div className="flex flex-col items-start gap-3">
                          <span className={`inline-flex items-center gap-2.5 font-bold px-4 py-2.5 rounded-xl text-sm md:text-base border shadow-sm ${displayScan.diagnosis === "Katarak Matur" ? "bg-red-50 text-red-700 border-red-200" : displayScan.diagnosis === "Katarak Imatur" ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${displayScan.diagnosis === "Katarak Matur" ? "bg-red-500 animate-pulse" : displayScan.diagnosis === "Katarak Imatur" ? "bg-orange-500" : "bg-emerald-500"}`}></span>
                            {displayScan.diagnosis}
                          </span>
                          <span className="text-sm font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
                            Tingkat Akurasi: <span className="text-slate-800">{displayScan.confidenceScore}%</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                      <button 
                        onClick={handleSelesai}
                        className="flex-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold px-4 py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <i className="ph-bold ph-check-circle text-lg"></i> Tandai Selesai
                      </button>
                      <Link 
                        href={`/history/${displayScan.scanId}`}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-3 rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)] flex items-center justify-center gap-2"
                      >
                        <i className="ph-bold ph-file-pdf text-lg"></i> Buka Laporan
                      </Link>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* PANEL TELEMETRI ALAT */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 relative overflow-hidden flex flex-col">
              
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <i className="ph-duotone ph-cpu"></i>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Telemetri Alat</h3>
              </div>

              <div className="space-y-5 flex-1">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Identifikasi Perangkat</p>
                  <p className="font-extrabold text-slate-900 text-lg tracking-tight">{device?.name || "Memuat..."}</p>
                  <p className="text-xs font-mono font-medium text-slate-500 mt-1">{device?.macAddress}</p>
                </div>

                <div className={`rounded-2xl p-5 border transition-all ${battery <= 20 && !isCharging ? 'bg-red-50 border-red-200 shadow-sm' : isCharging ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${battery <= 20 && !isCharging ? 'text-red-500' : isCharging ? 'text-blue-500' : 'text-slate-400'}`}>Daya Listrik</p>
                    {isCharging ? (
                      <i className="ph-duotone ph-lightning text-2xl text-blue-500 animate-pulse"></i>
                    ) : battery <= 10 ? (
                      <i className="ph-duotone ph-battery-warning text-2xl text-red-600 animate-ping"></i>
                    ) : battery <= 20 ? (
                      <i className="ph-duotone ph-battery-low text-2xl text-orange-500"></i>
                    ) : (
                      <i className="ph-duotone ph-battery-high text-2xl text-emerald-500"></i>
                    )}
                  </div>
                  <div className="flex items-end gap-1.5">
                    <h3 className={`text-4xl font-extrabold tracking-tight ${battery <= 20 && !isCharging ? 'text-red-700' : isCharging ? 'text-blue-700' : 'text-slate-900'}`}>{isConnected ? battery : '--'}</h3>
                    <span className="text-slate-500 font-bold mb-1.5">% 
                      {isCharging ? <span className="text-blue-600 text-[10px] uppercase ml-2 tracking-wider">(Mengisi Daya)</span> : 
                       battery <= 10 ? <span className="text-red-600 text-[10px] uppercase ml-2 tracking-wider">(Kritis)</span> : 
                       battery <= 20 ? <span className="text-orange-600 text-[10px] uppercase ml-2 tracking-wider">(Lemah)</span> : ''}
                    </span>
                  </div>
                </div>

                <div className={`rounded-2xl p-5 border transition-all ${latency > 200 ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <p className={`text-[10px] md:text-xs font-bold uppercase tracking-widest ${latency > 200 ? 'text-yellow-600' : 'text-slate-400'}`}>Ping Jaringan</p>
                    <i className={`ph-duotone ph-wifi-high text-2xl ${latency > 200 ? 'text-yellow-500' : 'text-slate-300'}`}></i>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <h3 className={`text-4xl font-extrabold tracking-tight ${latency > 200 ? 'text-yellow-700' : 'text-slate-900'}`}>{isConnected ? latency : '--'}</h3>
                    <span className="text-slate-500 font-bold mb-1.5">ms</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}