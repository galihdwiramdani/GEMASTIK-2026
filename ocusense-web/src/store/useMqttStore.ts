/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import mqtt from 'mqtt';

interface MqttState {
  client: mqtt.MqttClient | null;
  isConnected: boolean;
  battery: number;
  latency: number;
  isCharging: boolean; // 🟢 Status Pengecasan
  latestScanPayload: any | null;
  onlineDevices: Record<string, boolean>;
  connect: () => void;
  disconnect: () => void;
  clearLatestScan: () => void;
}

export const useMqttStore = create<MqttState>((set, get) => ({
  client: null,
  isConnected: false,
  battery: 0,
  latency: 0,
  isCharging: false,
  latestScanPayload: null,
  onlineDevices: {},
  clearLatestScan: () => set({ latestScanPayload: null }),
  
  connect: () => {
    const currentClient = get().client;
    if (currentClient && currentClient.connected) return;

    const client = mqtt.connect('ws://localhost:9001', {
      clientId: 'ocusense_web_' + Math.random().toString(16).substring(2, 10),
      reconnectPeriod: 1000,
      keepalive: 60
    });

    client.on('connect', () => {
      set({ isConnected: true, client });
      client.subscribe('ocusense/telemetry');
      client.subscribe('ocusense/scans'); 
      client.subscribe('ocusense/status/#'); 
    });

    client.on('message', (topic, message) => {
      if (topic.startsWith('ocusense/status/')) {
        const macAddress = topic.split('/')[2];
        try {
          const data = JSON.parse(message.toString());
          set((state) => ({
            onlineDevices: { ...state.onlineDevices, [macAddress]: data.status === 'online' }
          }));
        } catch (e) {}
      }

      if (topic === 'ocusense/telemetry') {
        try {
          const data = JSON.parse(message.toString());
          // 🟢 Tangkap Status Baterai, Ping, dan Mengecas
          set({ 
            battery: data.battery_percentage, 
            latency: data.latency_ms,
            isCharging: data.is_charging 
          });
        } catch (e) {}
      }
      
      if (topic === 'ocusense/scans') {
        try {
          const data = JSON.parse(message.toString());
          set({ latestScanPayload: data });
        } catch (e) {}
      }
    });

    client.on('offline', () => set({ isConnected: false }));
    client.on('close', () => set({ isConnected: false }));
    client.on('error', () => set({ isConnected: false }));
  },
  
  disconnect: () => {
    const { client } = get();
    if (client) {
      client.end();
      set({ client: null, isConnected: false });
    }
  }
}));