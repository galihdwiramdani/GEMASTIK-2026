import paho.mqtt.client as mqtt
import json
import random
import base64
import os
import uuid
import time
import threading
from datetime import datetime

# ==============================================================================
# [PANDUAN MIGRASI PERANGKAT KERAS] 1. IMPOR PUSTAKA FISIK & KECERDASAN BUATAN
# Aktifkan (hapus tanda pagar) modul di bawah ini saat kode dijalankan pada 
# lingkungan Raspberry Pi 5.
# ==============================================================================
# import cv2                                # Pustaka akuisisi citra untuk Kamera Raspberry Pi V2[cite: 1]
# from ina219 import INA219                 # Pustaka pembacaan telemetri baterai via protokol I2C[cite: 1]
# import Adafruit_SSD1306                   # Pustaka antarmuka Layar OLED 0.96 inci[cite: 1]
# from ultralytics import YOLO              # Pustaka lokalisasi area mata (YOLOv8)[cite: 1]
# from tensorflow.keras.models import load_model # Pustaka klasifikasi katarak (CNN FrequentlyNet)[cite: 1]

# ==============================================================================
# [PANDUAN MIGRASI PERANGKAT KERAS] 2. KONFIGURASI PIALANG MQTT (MQTT BROKER)
# Sesuaikan alamat peladen dengan IP Publik atau instans Cloud yang digunakan.
# ==============================================================================
MQTT_BROKER = "localhost" 
MQTT_PORT = 1883
PROFILES_FILE = "device_profiles.json"

# Variabel Global Simulasi Telemetri
current_battery = 100.0
is_charging = False
simulate_lag = False
fast_drain = False

# ==============================================================================
# [PANDUAN MIGRASI PERANGKAT KERAS] 3. INISIALISASI MODEL & PERANGKAT I/O
# ==============================================================================
# model_yolo = YOLO('yolov8_katarak.pt') 
# model_cnn = load_model('cnn_frequentlynet.h5')
# ina = INA219(SHUNT_OHMS=0.1) 
# ina.configure()
# oled = Adafruit_SSD1306.SSD1306_128_64(rst=None)
# oled.begin()

def load_profiles():
    if os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE, "r") as f:
            return json.load(f)
    return {}

def save_profiles(profiles):
    with open(PROFILES_FILE, "w") as f:
        json.dump(profiles, f, indent=4)

print("==================================================")
print("SISTEM TEPI OCUSENSE - SIMULATOR & PENGENDALI KAMERA")
print("==================================================")

profiles = load_profiles()
active_mac = None

if not profiles:
    print("[INFO] Belum ada profil perangkat keras yang terdaftar.")
    name = input("[INPUT] Masukkan Identitas Perangkat Baru (misal: Ocusense Node A): ")
    
    # Pengikatan Alamat MAC Otomatis
    active_mac = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) for elements in range(0,2*6,2)][::-1])
    pin = str(random.randint(1000, 9999))
    profiles[active_mac] = {"name": name, "mac": active_mac, "pin": pin}
    save_profiles(profiles)
else:
    print("[INFO] Daftar Profil Perangkat Tersedia:")
    mac_list = list(profiles.keys())
    for i, mac in enumerate(mac_list):
        print(f"[{i+1}] {profiles[mac]['name']} (MAC: {mac})")
    
    pilihan = int(input("\n[INPUT] Pilih urutan perangkat yang akan diinisialisasi (1/2/3...): "))
    if pilihan <= len(mac_list):
        active_mac = mac_list[pilihan-1]
        if "pin" not in profiles[active_mac]:
            profiles[active_mac]["pin"] = str(random.randint(1000, 9999))
            save_profiles(profiles)

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.will_set(f"ocusense/status/{active_mac}", json.dumps({"status": "offline"}), retain=True)
client.connect(MQTT_BROKER, MQTT_PORT, 60)
is_paired = False

def on_message(client, userdata, msg):
    global is_paired
    if msg.topic == f"ocusense/paired/{active_mac}":
        payload = json.loads(msg.payload.decode('utf-8'))
        print("\n==================================================")
        print("[SUKSES] Otorisasi Perangkat Berhasil.")
        print(f"[INFO] Profil Pasien Aktif: {payload.get('operator', 'Anonim')}")
        print("[INFO] Sistem siap menerima instruksi pemindaian.")
        print("==================================================\n")
        
        # [PANDUAN MIGRASI PERANGKAT KERAS] Umpan balik visual ke Layar OLED
        # oled.clear()
        # draw.text((0, 0), "Status: TERHUBUNG", fill=255)
        # oled.display()
        
        is_paired = True

client.on_message = on_message
client.subscribe(f"ocusense/paired/{active_mac}")

pairing_code = profiles[active_mac]["pin"]
init_payload = {
    "mac_address": active_mac,
    "device_name": profiles[active_mac]['name'],
    "pairing_code": pairing_code
}
client.publish("ocusense/register", json.dumps(init_payload), retain=True)

def send_telemetry():
    global current_battery
    while True:
        if is_paired:
            # ==============================================================================
            # [PANDUAN MIGRASI PERANGKAT KERAS] 4. PEMBACAAN DAYA SENSOR INA219
            # Gantikan blok logika simulasi daya di bawah dengan pembacaan perangkat keras.
            # ==============================================================================
            # tegangan = ina.voltage() #[cite: 1]
            # current_battery = (tegangan - 6.0) / (8.4 - 6.0) * 100 # Konversi rasio sel baterai 2S[cite: 1]
            # is_charging = True if ina.current() > 0 else False
            
            if is_charging:
                current_battery += 5.0
                if current_battery > 100: current_battery = 100.0
            elif fast_drain:
                current_battery -= 4.0
            else:
                current_battery -= random.uniform(0.1, 0.3)

            if current_battery <= 0:
                current_battery = 0
                client.publish(f"ocusense/status/{active_mac}", json.dumps({"status": "offline"}), retain=True)

            lat = random.uniform(500.0, 999.0) if simulate_lag else random.uniform(4.0, 15.0)
            
            telemetry_payload = {
                "mac_address": active_mac,
                "battery_percentage": max(0, int(current_battery)),
                "latency_ms": round(lat, 1),
                "is_charging": is_charging
            }
            client.publish("ocusense/telemetry", json.dumps(telemetry_payload))
            
        time.sleep(3)

threading.Thread(target=send_telemetry, daemon=True).start()

print(f"\n[INFO] KODE OTENTIKASI PERANGKAT: {pairing_code}")
print("[INFO] Menunggu jabat tangan dari antarmuka web...")

client.loop_start()
client.publish(f"ocusense/status/{active_mac}", json.dumps({"status": "online"}), retain=True)

try:
    while not is_paired:
        time.sleep(1)

    print("\n[INFO] DAFTAR PERINTAH SIMULASI TELEMETRI:")
    print("       /drain  : Mengurangi daya baterai secara drastis hingga mati.")
    print("       /charge : Mensimulasikan penyambungan sumber daya eksternal.")
    print("       /lag    : Mendistorsi latensi jaringan di atas 500ms.")
    print("       /normal : Memulihkan seluruh parameter simulasi ke kondisi stabil.")

    while True:
        cmd = input(f"\n[{profiles[active_mac]['name']}] Masukkan direktori citra atau perintah simulasi: ")
        
        if cmd.lower() == 'q': break
        elif cmd == '/drain': fast_drain = True; current_battery = 22.0; is_charging = False; print("[SIMULASI] Penurunan daya aktif."); continue
        elif cmd == '/charge': is_charging = True; fast_drain = False; client.publish(f"ocusense/status/{active_mac}", json.dumps({"status": "online"}), retain=True); print("[SIMULASI] Pengisian daya aktif."); continue
        elif cmd == '/lag': simulate_lag = True; print("[SIMULASI] Distorsi latensi jaringan aktif."); continue
        elif cmd == '/normal': simulate_lag = False; is_charging = False; fast_drain = False; current_battery = 100.0; client.publish(f"ocusense/status/{active_mac}", json.dumps({"status": "online"}), retain=True); print("[SIMULASI] Parameter distabilkan."); continue
            
        # ==============================================================================
        # [PANDUAN MIGRASI PERANGKAT KERAS] 5. AKUISISI CITRA DAN INFERENSI MODEL
        # Gantikan blok pembacaan fail lokal di bawah dengan integrasi modul kamera
        # dan inferensi model pembelajaran mesin sesungguhnya.
        # ==============================================================================
        # cap = cv2.VideoCapture(0)
        # ret, frame = cap.read()
        # hasil_yolo = model_yolo(frame) # Lokalisasi area mata dengan YOLOv8[cite: 1]
        # bbox = hasil_yolo.boxes[0].xyxy[0].tolist() 
        # crop_mata = frame[int(bbox[1]):int(bbox[3]), int(bbox[0]):int(bbox[2])]
        # prediksi_cnn = model_cnn.predict(crop_mata) # Penentuan klasifikasi dengan CNN[cite: 1]
        
        if not os.path.exists(cmd):
            print("[GALAT] Fail citra tidak ditemukan atau instruksi tidak valid.")
            continue
            
        with open(cmd, "rb") as img_file:
            image_base64 = base64.b64encode(img_file.read()).decode('utf-8')

        scan_id = f"SCN-{datetime.now().strftime('%H%M%S')}{random.randint(10,99)}"
        diagnosis = random.choice(["Katarak Matur", "Katarak Imatur", "Mata Normal"])
        confidence = round(random.uniform(90.0, 98.5) if diagnosis == "Katarak Matur" else random.uniform(75.0, 99.0), 1)
        yolo_box = [80, 40, 560, 420] 

        payload = {
            "mac_address": active_mac,
            "device_name": profiles[active_mac]['name'],
            "scan_id": scan_id,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "ai_analysis": {"diagnosis": diagnosis, "confidence_score": confidence, "bounding_box": yolo_box},
            "image": image_base64
        }
        
        # Pengiriman muatan (payload) menuju pialang MQTT
        client.publish("ocusense/scans", json.dumps(payload))
        print(f"[SUKSES] Transmisi data pindaian {scan_id} berhasil diselesaikan.")
        
        # [PANDUAN MIGRASI PERANGKAT KERAS] Umpan balik hasil inferensi ke Layar OLED[cite: 1]
        # oled.clear()
        # draw.text((0, 0), f"Hasil: {diagnosis}", fill=255)
        # oled.display()

except KeyboardInterrupt:
    print("\n[INFO] Menerima sinyal terminasi manual. Menutup koneksi klien.")
finally:
    client.publish(f"ocusense/status/{active_mac}", json.dumps({"status": "offline"}), retain=True)
    client.loop_stop()
    client.disconnect()