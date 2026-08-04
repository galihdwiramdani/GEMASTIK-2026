/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dayjs from "dayjs";
import 'dayjs/locale/id';
import { useMqttStore } from "@/store/useMqttStore";

dayjs.locale('id');

export default function SettingsPage() {
  const router = useRouter();
  const { isConnected, battery, latency } = useMqttStore();

  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [device, setDevice] = useState<any>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Modal State
  const [modal, setModal] = useState({ isOpen: false, type: "success", message: "" });

  useEffect(() => {
    const fetchSettings = async () => {
      const deviceId = typeof window !== 'undefined' ? localStorage.getItem("active_device_id") : null;
      if (deviceId) {
        setActiveDeviceId(deviceId);
        try {
          // PENGHANCUR CACHE AGAR DATA TERBARU MUNCUL LANGSUNG
          const res = await fetch(`/api/devices/${deviceId}?t=${Date.now()}`, { cache: 'no-store' });
          const data = await res.json();
          if (data.success && data.data) {
            setDevice(data.data);
            setPhone(data.data.alertPhone || "");
            setEmail(data.data.alertEmail || "");
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchSettings();
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeviceId) return;
    setIsSaving(true);
    try {
      await fetch(`/api/devices/${activeDeviceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertPhone: phone, alertEmail: email })
      });
      setModal({ isOpen: true, type: "success", message: "Konfigurasi notifikasi berhasil disimpan!" });
    } catch (error) {
      setModal({ isOpen: true, type: "error", message: "Gagal menyimpan konfigurasi server. Coba lagi." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutDevice = () => {
    localStorage.removeItem("active_device_id");
    router.push("/");
  };

  const calculateAge = (dobString: string) => {
    if (!dobString) return "-";
    return new Date().getFullYear() - new Date(dobString).getFullYear();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 w-full pb-12 font-sans text-slate-900">
      
      {/* MODAL KUSTOM ELEGAN */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-4xl p-8 md:p-10 max-w-sm w-full text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-100 animate-fade-in">
            <div className="flex justify-center mb-5">
              <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border shadow-sm ${modal.type === "success" ? "bg-emerald-50 text-emerald-500 border-emerald-100" : "bg-red-50 text-red-500 border-red-100"}`}>
                <i className={`ph-duotone ${modal.type === "success" ? "ph-check-circle" : "ph-warning-circle"} text-5xl`}></i>
              </div>
            </div>
            <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">{modal.type === "success" ? "Berhasil Disimpan" : "Terjadi Kesalahan"}</h3>
            <p className="text-slate-500 text-sm md:text-base font-medium mb-8">{modal.message}</p>
            <button onClick={() => setModal({ ...modal, isOpen: false })} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 md:py-4 rounded-xl transition-colors shadow-sm">
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* HEADER HALAMAN */}
      <div className="border-b border-slate-200/60 pb-6">
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">Konfigurasi Sistem</h2>
        <p className="text-slate-500 text-sm md:text-base font-medium mt-1.5">Pengaturan instrumen, identitas rekam medis, dan penjaluran notifikasi.</p>
      </div>

      {isLoading ? (
        // SKELETON LOADING
        <div className="animate-pulse space-y-6 md:space-y-8 pt-4">
          <div className="h-40 md:h-48 bg-slate-100 border border-slate-200 rounded-4xl w-full"></div>
          <div className="h-48 md:h-56 bg-slate-100 border border-slate-200 rounded-4xl w-full"></div>
          <div className="h-64 md:h-72 bg-slate-100 border border-slate-200 rounded-4xl w-full"></div>
        </div>
      ) : (
        <div className="pt-2 space-y-6 md:space-y-8">
          
          {/* KARTU PROFIL PASIEN (Clean Blue) */}
          <div className="bg-blue-600 rounded-4xl p-8 md:p-10 text-white shadow-[0_8px_30px_rgba(37,99,235,0.15)] relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/30 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="w-20 h-20 bg-white/10 border border-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shrink-0">
                <i className="ph-duotone ph-user text-4xl text-white"></i>
              </div>
              <div>
                <span className="bg-blue-700/50 text-blue-100 text-[10px] md:text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3 inline-block">Profil Pasien Aktif</span>
                <h2 className="text-2xl md:text-4xl font-extrabold mb-1.5 tracking-tight">{device?.operatorName || "Belum Dikonfigurasi"}</h2>
                <p className="text-xs md:text-sm text-blue-100 font-medium flex items-center gap-2">
                  {device?.operatorDob ? `Usia Pasien: ${calculateAge(device.operatorDob)} Tahun` : "Data usia belum dimasukkan ke dalam sistem"}
                </p>
              </div>
            </div>
            
            <div className="relative z-10 shrink-0 hidden md:block">
              <i className="ph-duotone ph-identification-card text-7xl text-white/20"></i>
            </div>
          </div>

          {/* STATUS PERANGKAT TEPI */}
          <div className="bg-white rounded-4xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
            <h3 className="text-xl font-extrabold text-slate-900 mb-6 border-b border-slate-100 pb-4 flex items-center gap-3 tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <i className="ph-duotone ph-hard-drives"></i>
              </div>
              Pemantauan Instrumen Fisik
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="p-5 md:p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-50">
                <div className="truncate pr-4">
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Identitas Perangkat</p>
                  <p className="font-extrabold text-slate-900 tracking-tight truncate text-base md:text-lg">{device?.name}</p>
                  <p className="text-[10px] md:text-xs font-mono font-medium text-slate-500 mt-0.5">{device?.macAddress}</p>
                </div>
                <span className={`text-[10px] md:text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-2 shrink-0 shadow-sm border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                  {isConnected ? `Online` : 'Offline'}
                </span>
              </div>
              
              <div className="p-5 md:p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex justify-between items-center transition-all hover:bg-slate-50">
                <div>
                  <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Daya Kelistrikan</p>
                  <p className="font-extrabold text-slate-900 tracking-tight text-base md:text-lg">Sensor Baterai</p>
                </div>
                <span className={`text-base md:text-lg font-extrabold flex items-center gap-2 tracking-tight ${battery > 20 ? 'text-blue-700' : 'text-red-600'}`}>
                  <i className={battery > 20 ? "ph-duotone ph-battery-high text-2xl md:text-3xl text-blue-500" : "ph-duotone ph-battery-warning text-2xl md:text-3xl text-red-500"}></i>
                  {isConnected ? `${battery}%` : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* FORMULIR PENJALURAN NOTIFIKASI */}
          <div className="bg-white rounded-4xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-10">
            <h3 className="text-xl font-extrabold text-slate-900 mb-2 flex items-center gap-3 tracking-tight">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                <i className="ph-duotone ph-siren"></i>
              </div>
              Penjaluran Laporan Darurat
            </h3>
            <p className="text-sm text-slate-500 mb-8 max-w-2xl font-medium leading-relaxed pl-11">
              Sistem akan mengirimkan laporan medis (PDF) secara otonom ke kontak di bawah ini apabila instrumen mengklasifikasikan temuan sebagai indikasi Katarak Matur.
            </p>
            
            <form onSubmit={handleSaveConfig} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Nomor WhatsApp Dokter/Wali</label>
                  <input 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="Contoh: 6281234567890" 
                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl px-5 py-3.5 md:py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Alamat Email Rumah Sakit</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="Contoh: dokter@rumah-sakit.com" 
                    className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl px-5 py-3.5 md:py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm text-sm" 
                  />
                </div>
              </div>
              
              <div className="text-right pt-6 mt-4 border-t border-slate-100">
                <button type="submit" disabled={isSaving} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 md:py-4 px-8 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)]">
                  {isSaving ? <i className="ph-bold ph-spinner animate-spin text-lg"></i> : <i className="ph-bold ph-floppy-disk text-lg"></i>}
                  {isSaving ? "Menyimpan Konfigurasi..." : "Simpan Konfigurasi"}
                </button>
              </div>
            </form>
          </div>

          {/* TOMBOL KELUAR */}
          <div className="pt-2 flex justify-end">
            <button onClick={handleLogoutDevice} className="w-full md:w-auto bg-white hover:bg-red-50 hover:border-red-200 text-red-600 font-bold py-3.5 md:py-4 px-8 rounded-xl flex items-center justify-center gap-2.5 transition-all border border-slate-200 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
              <i className="ph-duotone ph-sign-out text-lg md:text-xl"></i> Akhiri Sesi (Ganti Instrumen)
            </button>
          </div>
          
        </div>
      )}
    </div>
  );
}