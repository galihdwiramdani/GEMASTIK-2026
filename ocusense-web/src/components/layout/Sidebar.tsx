/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useMqttStore } from "@/store/useMqttStore";

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const { isConnected, latency, battery } = useMqttStore();
  const [device, setDevice] = useState<any>(null);

  useEffect(() => {
    const activeDeviceId = typeof window !== 'undefined' ? localStorage.getItem("active_device_id") : null;
    if (activeDeviceId) {
      fetch(`/api/devices/${activeDeviceId}`).then(res => res.json()).then(data => {
        if (data.success && data.data) setDevice(data.data);
      });
    }
  }, []);

  const menuItems = [
    { name: "Pantauan Klinis", path: "/dashboard", icon: "ph-monitor" },
    { name: "Rekam Medis", path: "/history", icon: "ph-folder-open" },
    { name: "Konfigurasi Sistem", path: "/settings", icon: "ph-gear" },
  ];

  return (
    <>
      {/* Overlay Gelap untuk HP */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-40 backdrop-blur-sm md:hidden transition-opacity" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Sidebar Utama: Clean White & Echo Blue */}
      <aside className={`fixed md:sticky top-0 z-50 h-screen w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} print:hidden shadow-[4px_0_24px_rgba(0,0,0,0.02)] font-sans`}>
        
        {/* Header & Tombol Tutup HP */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-[0_4px_12px_rgba(37,99,235,0.25)]">
              <i className="ph-duotone ph-camera text-xl text-white"></i>
            </div>
            <h1 className="font-extrabold text-xl tracking-tight text-slate-900">Ocusense</h1>
          </div>
          <button className="md:hidden text-slate-400 hover:text-slate-700 transition-colors" onClick={() => setIsOpen(false)}>
            <i className="ph-bold ph-x text-2xl"></i>
          </button>
        </div>

        <nav className="flex-1 py-8 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Navigasi Utama</p>
          {menuItems.map((item) => {
            const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);
            return (
              <Link key={item.name} href={item.path} onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-bold text-sm ${isActive ? "bg-blue-50 text-blue-700 border border-blue-100 shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 border border-transparent"}`}
              >
                <i className={`ph-duotone ${item.icon} text-xl ${isActive ? "text-blue-600" : "text-slate-400"}`}></i>
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Panel Telemetri Kompak */}
        <div className="mx-4 mb-6 bg-slate-50 border border-slate-200/60 rounded-[1.25rem] p-5 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-bl-full blur-xl pointer-events-none"></div>
          
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Identitas Perangkat</p>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-blue-600 shrink-0 shadow-sm">
              <i className="ph-duotone ph-cpu text-xl"></i>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-slate-800 truncate tracking-tight">{device ? device.name : "Memuat..."}</p>
              <p className="text-[10px] font-mono font-medium text-slate-500 truncate">{device ? device.macAddress : "..."}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Ping Jaringan</p>
              <div className="flex items-center justify-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                <p className={`text-xs font-bold font-mono tracking-tight ${isConnected ? 'text-slate-700' : 'text-red-600'}`}>{isConnected ? `${latency} ms` : 'OFFLINE'}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-slate-200 shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Daya Baterai</p>
              <p className={`text-xs font-bold font-mono tracking-tight ${battery > 20 ? 'text-blue-700' : 'text-red-600'}`}>{isConnected ? `${battery}%` : '--'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}