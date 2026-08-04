import os
import time
import platform
import cv2
from ultralytics import YOLO
from network_camera import NetworkCameraReceiver

CAMERA_INDEX = "socket:5001"
CAMERA_BRIGHTNESS = 150
TARGET_LABEL = "Clear_Eye_Area"


def clean_folder(folder):
    if not os.path.exists(folder):
        os.makedirs(folder, exist_ok=True)
        return
    for f in os.listdir(folder):
        file_path = os.path.join(folder, f)
        try:
            if os.path.isfile(file_path):
                os.remove(file_path)
        except Exception as e:
            print(f"[WARNING] Gagal menghapus {file_path}: {e}")


def open_camera(index=0):
    
    if isinstance(index, str) and index.startswith("socket:"):
        port = int(index.split(":", 1)[1])
        return NetworkCameraReceiver(port)

    if isinstance(index, str):
        print(f"[INFO] Membuka kamera dari stream jaringan (HTTP): {index}")
        cap = cv2.VideoCapture(index)
    else:
        system = platform.system()
        if system == "Windows":
            cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    brightness_ok = cap.set(cv2.CAP_PROP_BRIGHTNESS, CAMERA_BRIGHTNESS)
    if not brightness_ok:
        print(
            "[WARNING] Kamera ini sepertinya tidak mendukung pengaturan "
            "brightness lewat OpenCV. Atur kecerahan manual lewat "
            "aplikasi kamera bawaan Windows kalau perlu."
        )
    return cap

def run_yolo(stop_event=None, camera_index=None, show_window=True, camera=None):
    if camera is not None:
        cap = camera
        print("[INFO] Memakai objek kamera yang diberikan dari luar (main.py).")
    else:
        if camera_index is None:
            camera_index = CAMERA_INDEX
        cap = open_camera(camera_index)
        print(f"[INFO] Membuka kamera index={camera_index}")

    model = YOLO("models/best.pt")

    if not cap.isOpened():
        print("[ERROR] Gagal membuka kamera.")
        return

    class_colors = {
        0: (0, 165, 255),
        1: (255, 255, 255),
        2: (0, 255, 0)
    }
    SAVE_ORIGINAL = "waiting/original"
    SAVE_CROP = "waiting/crop"
    SAVE_BBOX = "waiting/bbox"

    for folder in [SAVE_ORIGINAL, SAVE_CROP, SAVE_BBOX]:
        os.makedirs(folder, exist_ok=True)
        clean_folder(folder)

    CONF_DETECT = 0.5
    CONF_SAVE = 0.8
    SAVE_INTERVAL = 5
    MIN_WIDTH = 120
    MIN_HEIGHT = 60

    last_save_time = 0
    image_count = 0
    prev_time = time.time()
    FPS_PRINT_INTERVAL = 1.0
    last_fps_print_time = time.time()
    print("[INFO] YOLO thread dimulai. Tekan 'q' pada window untuk berhenti.")

    try:
        while True:
            if stop_event is not None and stop_event.is_set():
                break

            ret, frame = cap.read()
            if not ret:
                print("[WARNING] Frame tidak terbaca, mencoba lagi...")
                time.sleep(0.1)
                continue

            annotated_frame = frame.copy()

            results = model.predict(
                source=frame,
                imgsz=640,
                conf=CONF_DETECT,
                verbose=False,
                stream=True
            )

            for result in results:
                for box in result.boxes:

                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls = int(box.cls[0])
                    conf = float(box.conf[0])
                    label = model.names[cls]
                    color = class_colors.get(cls, (255, 255, 255))

                    h, w = frame.shape[:2]
                    x1 = max(0, x1)
                    y1 = max(0, y1)
                    x2 = min(w, x2)
                    y2 = min(h, y2)
                    width = x2 - x1
                    height = y2 - y1

                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)

                    text = f"{label} {conf:.2f}"
                    (font_w, font_h), baseline = cv2.getTextSize(
                        text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                    )

                    text_y = y1 - 10
                    if text_y < font_h + 5:
                        text_y = y1 + font_h + 10

                    cv2.rectangle(
                        annotated_frame,
                        (x1, text_y - font_h - 5),
                        (x1 + font_w + 5, text_y + baseline),
                        color,
                        -1
                    )

                    cv2.putText(
                        annotated_frame, text, (x1 + 2, text_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 2
                    )

                    current_time = time.time()

                    if (
                        label == TARGET_LABEL
                        and conf >= CONF_SAVE
                        and width >= MIN_WIDTH
                        and height >= MIN_HEIGHT
                        and (current_time - last_save_time) >= SAVE_INTERVAL
                    ):
                        crop = frame[y1:y2, x1:x2]
                        if crop.size == 0:
                            continue

                        timestamp = time.strftime("%Y%m%d_%H%M%S")
                        base_name = f"{timestamp}_{conf:.2f}.jpg"
                        crop_resized = cv2.resize(crop, (224, 224))
                        original_path = os.path.join(SAVE_ORIGINAL, base_name)
                        crop_path = os.path.join(SAVE_CROP, base_name)
                        bbox_path = os.path.join(SAVE_BBOX, base_name)

                        cv2.imwrite(original_path, frame)
                        cv2.imwrite(bbox_path, annotated_frame.copy())
                        cv2.imwrite(crop_path, crop_resized)
                        print(f"[INFO] Original Saved : {original_path}")
                        print(f"[INFO] BBox Saved     : {bbox_path}")
                        print(f"[INFO] Crop Saved     : {crop_path}")

                        image_count += 1
                        last_save_time = current_time

            current = time.time()
            fps = 1 / (current - prev_time) if current != prev_time else 0
            prev_time = current

            if current - last_fps_print_time >= FPS_PRINT_INTERVAL:
                print(f"[INFO] FPS : {fps:.1f}")
                last_fps_print_time = current

            if show_window:
                remain = max(0, SAVE_INTERVAL - (time.time() - last_save_time))
                cv2.putText(
                    annotated_frame, f"Save : {remain:.1f}s", (20, 60),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2
                )

                cv2.imshow("YOLOv8 Eye Detection", annotated_frame)
                key = cv2.waitKey(1)
                if key == ord('q'):
                    if stop_event is not None:
                        stop_event.set()
                    break

    finally:
        cap.release()
        cv2.destroyAllWindows()
        print("[INFO] YOLO thread berhenti.")


if __name__ == "__main__":
    run_yolo()