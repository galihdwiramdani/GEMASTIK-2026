/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useMqttStore } from "@/store/useMqttStore";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  // 🟢 Tarik Data Lengkap
  const { connect, onlineDevices, isConnected, battery, latency, isCharging } = useMqttStore();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [macAddress, setMacAddress] = useState("");
  
  const [isKicked, setIsKicked] = useState(false);
  const [isBatteryDead, setIsBatteryDead] = useState(false);

  useEffect(() => {
    const deviceId = localStorage.getItem("active_device_id");
    if (!deviceId) {
      router.replace("/");
    } else {
      fetch(`/api/devices/${deviceId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) setMacAddress(data.data.macAddress);
        });
      setIsCheckingAuth(false);
      connect();
    }
  }, [pathname, router, connect]);

  // 🟢 LOGIKA MODAL BATERAI HABIS & KICK OTOMATIS
  useEffect(() => {
    if (isConnected && macAddress && onlineDevices[macAddress] === false) {
      if (battery === 0 && !isCharging) {
        setIsBatteryDead(true);
        setTimeout(() => {
          localStorage.removeItem("active_device_id");
          router.replace("/");
        }, 5000); // Tunggu 5 detik agar pesan terbaca sebelum dilempar
      } else {
        setIsKicked(true);
        setTimeout(() => {
          localStorage.removeItem("active_device_id");
          router.replace("/");
        }, 4000);
      }
    }
  }, [isConnected, onlineDevices, macAddress, battery, isCharging, router]);

  // Tampilan Baterai Mati (0%) - Desain Klinis
  if (isBatteryDead) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background-main font-sans z-50 fixed inset-0 animate-fade-in p-4">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-red-500"></div>
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-red-100 shadow-sm">
            <i className="ph-duotone ph-battery-empty text-5xl animate-pulse"></i>
          </div>
          <h2 className="text-2xl font-extrabold mb-3 text-slate-900 tracking-tight">Daya Terkuras Habis (0%)</h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">Instrumen fisik Ocusense terputus dari jaringan secara otomatis akibat kehabisan suplai daya listrik.</p>
          <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-400 bg-slate-50 py-3.5 rounded-xl border border-slate-100">
            <i className="ph-bold ph-spinner animate-spin text-lg"></i> Mengakhiri sesi rekam medis...
          </div>
        </div>
      </div>
    );
  }

  // Tampilan Kicked Out Biasa (Alat Dimatikan paksa) - Desain Klinis
  if (isKicked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background-main font-sans z-50 fixed inset-0 animate-fade-in p-4">
        <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100 max-w-md w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-orange-500"></div>
          <div className="w-24 h-24 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-100 shadow-sm">
            <i className="ph-duotone ph-warning-octagon text-5xl animate-bounce"></i>
          </div>
          <h2 className="text-2xl font-extrabold mb-3 text-slate-900 tracking-tight">Transmisi Terputus</h2>
          <p className="text-slate-500 mb-8 leading-relaxed font-medium">Instrumen fisik Ocusense baru saja dimatikan secara sepihak atau terputus secara paksa dari protokol jaringan.</p>
          <div className="flex items-center justify-center gap-3 text-sm font-bold text-slate-400 bg-slate-50 py-3.5 rounded-xl border border-slate-100">
            <i className="ph-bold ph-spinner animate-spin text-lg"></i> Mengembalikan ke layar utama...
          </div>
        </div>
      </div>
    );
  }

  // Animasi Pemuatan Awal (Verifikasi Sesi)
  if (isCheckingAuth) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background-main font-sans z-50 fixed inset-0">
        <div className="relative w-20 h-20 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
          <i className="ph-duotone ph-shield-check text-2xl text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">Memverifikasi Sesi</h2>
        <p className="font-medium text-slate-500 animate-pulse text-sm">Menghubungkan klien ke jalur telemetri...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background-main font-sans text-slate-900 relative overflow-hidden">
      
      {/* 🟢 TAMPILAN MODAL RECONNECTING KARENA LAG TINGGI */}
      {latency > 300 && !isKicked && !isBatteryDead && (
        <div className="fixed inset-0 z-100 bg-white/80 backdrop-blur-xl flex flex-col items-center justify-center font-sans animate-fade-in p-4 text-center">
          <div className="w-24 h-24 bg-yellow-50 text-yellow-600 rounded-2xl flex items-center justify-center mb-6 border border-yellow-100 shadow-[0_8px_30px_rgba(234,179,8,0.15)]">
             <i className="ph-duotone ph-wifi-x text-5xl animate-pulse"></i>
          </div>
          <h2 className="text-3xl font-extrabold mb-4 text-slate-900 tracking-tight">Stabilitas Jaringan Memburuk</h2>
          <p className="text-slate-500 font-medium text-lg flex items-center gap-2">
            Latensi melonjak hingga <span className="text-yellow-700 font-extrabold bg-yellow-100 px-2.5 py-0.5 rounded-lg border border-yellow-200 shadow-sm">{latency} ms</span>
          </p>
          <p className="text-slate-400 text-sm mt-4 font-bold flex items-center gap-2">
            <i className="ph-bold ph-spinner animate-spin"></i> Menunggu telemetri stabil...
          </p>
        </div>
      )}

      <Sidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <div className="flex-1 flex flex-col min-w-0 w-full h-screen overflow-y-auto custom-scrollbar">
        <Navbar onMenuClick={() => setIsMobileMenuOpen(true)} />
        <main className="flex-1 p-4 md:p-8 w-full max-w-360 mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}