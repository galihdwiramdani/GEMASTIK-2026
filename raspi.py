import socket
import struct
import time
import cv2

LAPTOP_IP = "192.168.100.106"
PORT = 5001
RECONNECT_DELAY = 2.0  
CAMERA_INDEX = 0
FRAME_WIDTH = 640
FRAME_HEIGHT = 480
FRAME_FPS = 30
JPEG_QUALITY = 80   
AUTO_EXPOSURE = 0.25   
EXPOSURE = -5
GAIN = 5

def configure_camera(cap):
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, FRAME_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, FRAME_FPS)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, AUTO_EXPOSURE)
    cap.set(cv2.CAP_PROP_EXPOSURE, EXPOSURE)
    cap.set(cv2.CAP_PROP_GAIN, GAIN)
    return cap


def send_camera_stream():
    cap = cv2.VideoCapture(CAMERA_INDEX)
    cap = configure_camera(cap)
    print(
        f"[CAM] Kamera index {CAMERA_INDEX} dibuka "
        f"({cap.get(cv2.CAP_PROP_FRAME_WIDTH)}x{cap.get(cv2.CAP_PROP_FRAME_HEIGHT)} "
        f"@ {cap.get(cv2.CAP_PROP_FPS)}fps)"
    )
    capture_count = 0
    capture_timer = time.time()

    while True:
        sock = None
        try:
            print(f"[CAM] Menghubungkan ke {LAPTOP_IP}:{PORT} ...")
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((LAPTOP_IP, PORT))
            sock.setsockopt(socket.IPPROTO_TCP, socket.TCP_NODELAY, 1)
            print("[CAM] Terhubung ke laptop.")

            while True:
                success, frame = cap.read()
                if not success:
                    time.sleep(0.05)
                    continue

                capture_count += 1
                if time.time() - capture_timer >= 1.0:
                    print(f"[CAPTURE] {capture_count} frame/detik berhasil di-capture kamera")
                    capture_count = 0
                    capture_timer = time.time()

                ok, encoded = cv2.imencode(
                    ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY]
                )
                if not ok:
                    continue

                data = encoded.tobytes()
                header = struct.pack(">L", len(data))  
                sock.sendall(header + data)

        except (ConnectionRefusedError, BrokenPipeError,
                ConnectionResetError, OSError) as e:
            print(f"[CAM] Koneksi terputus ({e}). Coba lagi dalam {RECONNECT_DELAY}s ...")
            time.sleep(RECONNECT_DELAY)
        finally:
            if sock is not None:
                try:
                    sock.close()
                except Exception:
                    pass

if __name__ == "__main__":
    print("=== RASPI CAMERA SENDER ===")
    print(f"Target laptop : {LAPTOP_IP}:{PORT}")
    print("Pastikan main.py sudah jalan duluan di laptop.\n")

    try:
        send_camera_stream()
    except KeyboardInterrupt:
        print("\n[INFO] Dihentikan manual (Ctrl+C).")