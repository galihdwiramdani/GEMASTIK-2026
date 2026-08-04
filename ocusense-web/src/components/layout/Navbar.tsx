"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMqttStore } from "@/store/useMqttStore";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { isConnected } = useMqttStore();
  const [deviceName, setDeviceName] = useState("Memuat...");

  useEffect(() => {
    const activeDeviceId = typeof window !== 'undefined' ? localStorage.getItem("active_device_id") : null;
    if (activeDeviceId) {
      fetch(`/api/devices/${activeDeviceId}`).then(res => res.json()).then(data => {
        if (data.success && data.data) setDeviceName(data.data.name);
      });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("active_device_id");
    router.push("/");
  };

  return (
    <header className="h-16 md:h-20 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 print:hidden shrink-0 font-sans shadow-[0_4px_24px_rgba(0,0,0,0.02)] transition-all">
      <div className="flex items-center gap-4">
        {/* Tombol Burger Mobile */}
        <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-blue-600 p-2 transition-colors rounded-lg hover:bg-slate-50">
          <i className="ph-duotone ph-list text-2xl"></i>
        </button>
        
        <div className="hidden md:block">
          <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">Pusat Kendali Ocusense</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`}></span>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{isConnected ? 'Telemetri Aktif' : 'Menunggu Sinyal Perangkat'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-5">
        <div className="bg-white border border-slate-200 px-3 py-1.5 md:px-4 md:py-2 rounded-full flex items-center gap-2.5 max-w-30 md:max-w-xs shadow-sm transition-all hover:border-blue-200">
          <i className="ph-duotone ph-cpu text-blue-600 shrink-0 text-lg"></i>
          <span className="text-xs md:text-sm font-bold text-slate-700 truncate">{deviceName}</span>
        </div>
        
        <button onClick={handleLogout} className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:border-red-100 hover:text-red-600 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0" title="Akhiri Sesi">
          <i className="ph-duotone ph-sign-out text-lg"></i>
        </button>
      </div>
    </header>
  );
}