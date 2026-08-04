import threading
import time
from Yolo_detect import run_yolo
from cnn_predict import run_cnn

def main():
    print("=" * 60)
    print(" Cataract Detection System ")
    print("=" * 60)

    stop_event = threading.Event()

    yolo_thread = threading.Thread(
        target=run_yolo,
        kwargs={"stop_event": stop_event},
        name="YOLO-Thread",
        daemon=True
    )

    cnn_thread = threading.Thread(
        target=run_cnn,
        kwargs={"stop_event": stop_event},
        name="CNN-Thread",
        daemon=True
    )

    yolo_thread.start()
    cnn_thread.start()
    
    try:
        while yolo_thread.is_alive() or cnn_thread.is_alive():
            time.sleep(0.2)

    except KeyboardInterrupt:
        print("\n[INFO] Ctrl+C terdeteksi. Menghentikan program...")
        stop_event.set()

    yolo_thread.join(timeout=5)
    cnn_thread.join(timeout=5)

    print("[INFO] Program berhenti dengan bersih.")


if __name__ == "__main__":
    main()