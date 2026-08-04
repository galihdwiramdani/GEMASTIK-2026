/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMqttStore } from "@/store/useMqttStore";

export default function LandingPage() {
  const router = useRouter();
  
  // 🟢 Tarik status dari store
  const { connect, onlineDevices } = useMqttStore();

  const [currentStep, setCurrentStep] = useState<string>("LIST");
  const [devices, setDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  
  const [inputPin, setInputPin] = useState("");
  const [loginError, setLoginError] = useState(""); 
  const [opName, setOpName] = useState("");
  const [opDob, setOpDob] = useState("");

  const fetchDevices = () => {
    fetch("/api/devices", { cache: 'no-store' })
      .then(res => res.json())
      .then(data => setDevices(data.data || []));
  };

  useEffect(() => {
    connect(); 
    fetchDevices();
  }, [connect]);

  const handleSelectDevice = (device: any) => {
    setSelectedDevice(device);
    setCurrentStep("PAIRING");
    setInputPin("");
    setLoginError("");
  };

  const handleDeleteDevice = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if(confirm(`Hapus alat "${name}"? \nRiwayat pemeriksaan tetap aman.`)) {
      await fetch(`/api/devices/${id}`, { method: 'DELETE' });
      fetchDevices();
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (onlineDevices[selectedDevice.macAddress] !== true) {
      setLoginError("Alat fisik ini sedang offline (mati). Silakan nyalakan sistem alat terlebih dahulu.");
      return;
    }

    if (selectedDevice.pairingCode === inputPin) {
      if (selectedDevice.operatorName) {
        await fetch(`/api/devices/${selectedDevice.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operatorName: selectedDevice.operatorName })
        });
        startHandshake(selectedDevice.id);
      } else {
        setCurrentStep("REGISTER");
      }
    } else {
      setLoginError("PIN yang Anda masukkan tidak valid.");
    }
  };

  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/devices/${selectedDevice.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operatorName: opName, operatorDob: new Date(opDob) })
    });
    startHandshake(selectedDevice.id);
  };

  const startHandshake = (deviceId: string) => {
    setCurrentStep("CONNECTING");
    setTimeout(() => {
      localStorage.setItem("active_device_id", deviceId);
      router.push("/dashboard");
    }, 2000);
  };

  return (
    // 🟢 TEMA: Clean White & Echo Blue (Elegan, Profesional, Medis Modern)
    // Pastikan Anda mengimpor font Plus Jakarta Sans di layout.tsx Anda agar 'font-sans' merendernya.
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 md:p-6 relative overflow-hidden font-sans text-slate-800">
      
      {/* Ornamen Latar Belakang: "Blue Echoes" yang sangat halus (Tidak AI Slop) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none opacity-60">
        <div className="absolute w-100 h-100 md:w-150 md:h-150 rounded-full border-[1.5px] border-blue-200/50"></div>
        <div className="absolute w-150 h-150 md:w-225 md:h-225 rounded-full border-[1.5px] border-blue-100/50"></div>
        <div className="absolute w-200 h-200 md:w-300 md:h-300 rounded-full border-[1.5px] border-slate-200/30"></div>
        {/* Bias Cahaya Biru Elegan */}
        <div className="absolute top-0 right-0 w-125 h-125 bg-blue-400/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-150 h-150 bg-blue-600/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Wadah Utama (Main Card) */}
      <div className="w-full max-w-136 bg-white rounded-4xl p-8 md:p-12 shadow-[0_20px_60px_-15px_rgba(37,99,235,0.08)] border border-slate-100 relative z-10 transition-all duration-500">
        
        {currentStep === "LIST" && (
          <div className="animate-fade-in text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-blue-100/50">
              <i className="ph-duotone ph-broadcast text-4xl text-blue-600"></i>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Ocusense Edge</h1>
            <p className="text-slate-500 text-sm md:text-base mb-8 font-medium">Pilih perangkat pemindai klinis yang terhubung di jaringan Anda.</p>
            
            {devices.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200/60 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                <i className="ph-duotone ph-info text-4xl text-slate-400 mb-3"></i>
                <p className="text-slate-600 text-sm font-medium mb-5">Menunggu sinyal perangkat keras...<br/>Nyalakan modul alat fisik Anda.</p>
                <button onClick={fetchDevices} className="text-sm font-bold bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-blue-700 px-6 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2">
                  <i className="ph-bold ph-arrows-clockwise"></i> Segarkan Jaringan
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-left max-h-88 overflow-y-auto pr-2 custom-scrollbar">
                {devices.map((device) => (
                  <div key={device.id} className="relative group">
                    <button onClick={() => handleSelectDevice(device)} className="w-full bg-white border border-slate-200 hover:border-blue-400 p-5 rounded-2xl flex items-center justify-between transition-all hover:shadow-[0_8px_20px_-6px_rgba(37,99,235,0.12)]">
                      
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 text-blue-600 border border-slate-100 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                          <i className="ph-duotone ph-cpu text-2xl"></i>
                        </div>
                        <div className="text-left">
                          <h3 className="font-bold text-slate-800 text-lg tracking-tight">{device.name}</h3>
                          <p className="text-xs font-medium text-slate-500 mt-0.5">
                            {device.operatorName ? `Pasien: ${device.operatorName}` : "⚠️ Rekam Medis Kosong"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 ${onlineDevices[device.macAddress] === true ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${onlineDevices[device.macAddress] === true ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                          <span className="hidden md:inline">{onlineDevices[device.macAddress] === true ? 'Terhubung' : 'Terputus'}</span>
                        </span>
                        
                        <div 
                          onClick={(e) => handleDeleteDevice(e, device.id, device.name)} 
                          className="w-9 h-9 flex items-center justify-center text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
                          title="Hapus Alat"
                        >
                          <i className="ph-bold ph-trash text-lg"></i>
                        </div>
                      </div>

                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentStep === "PAIRING" && (
          <form onSubmit={handleVerifyPin} className="animate-fade-in text-left">
            <button type="button" onClick={() => setCurrentStep("LIST")} className="text-slate-400 hover:text-blue-600 mb-8 flex items-center gap-2 text-sm font-bold transition-colors">
              <i className="ph-bold ph-arrow-left text-lg"></i> Kembali
            </button>
            
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
              <i className="ph-duotone ph-lock-key text-3xl text-blue-600"></i>
            </div>
            
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Otorisasi Alat</h2>
            <p className="text-slate-500 text-sm md:text-base mb-8 font-medium">Masukkan <strong>4-Digit PIN</strong> keamanan dari terminal <span className="text-slate-800 font-bold">{selectedDevice?.name}</span>.</p>
            
            <div className="mb-8">
              <input 
                type="text" 
                maxLength={4} 
                required 
                value={inputPin} 
                onChange={e => setInputPin(e.target.value)} 
                className={`w-full bg-slate-50 border ${loginError ? 'border-red-400 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'} text-slate-900 font-mono text-center text-4xl md:text-5xl tracking-[0.5em] rounded-2xl px-4 py-6 outline-none transition-all font-bold focus:ring-4`} 
                placeholder="••••" 
                autoComplete="off"
              />
              {loginError && <p className="text-red-500 text-sm font-bold mt-4 flex items-center gap-1.5 justify-center"><i className="ph-fill ph-warning-circle text-lg"></i> {loginError}</p>}
            </div>
            
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)]">
              Verifikasi Kredensial
            </button>
          </form>
        )}

        {currentStep === "REGISTER" && (
          <form onSubmit={handleRegisterProfile} className="animate-fade-in text-left">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">Data Pasien</h2>
            <p className="text-slate-500 text-sm md:text-base mb-8 font-medium">Profil alat ini belum dikonfigurasi. Lengkapi identitas pasien untuk rekam medis.</p>
            
            <div className="space-y-6 mb-10">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Nama Lengkap Pasien</label>
                <input 
                  type="text" 
                  required 
                  value={opName} 
                  onChange={e => setOpName(e.target.value)} 
                  className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" 
                  placeholder="Contoh: Budi Santoso" 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Tanggal Lahir</label>
                <input 
                  type="date" 
                  required 
                  value={opDob} 
                  onChange={e => setOpDob(e.target.value)} 
                  className="w-full bg-white border border-slate-200 text-slate-800 font-semibold rounded-xl px-5 py-4 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" 
                />
              </div>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg py-4 rounded-xl transition-all shadow-[0_8px_20px_-6px_rgba(37,99,235,0.4)]">
              Simpan & Hubungkan
            </button>
          </form>
        )}

        {currentStep === "CONNECTING" && (
          <div className="py-12 animate-fade-in text-center flex flex-col items-center">
            {/* Animasi Spinner Presisi (Non-AI Slop) */}
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
              <i className="ph-duotone ph-check-circle text-2xl text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Mengamankan Sesi...</h2>
            <p className="text-slate-500 font-medium">Membangun koneksi telemetri ke dasbor klinis.</p>
          </div>
        )}

      </div>
    </div>
  );
}