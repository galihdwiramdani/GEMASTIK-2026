import argparse
import sys
from pathlib import Path
from datetime import datetime

GAMBAR_PATH = "test.avif"

MODEL_PATH = None

try:
    from ultralytics import YOLO
except ImportError:
    print("Package 'ultralytics' belum terinstall.")
    print("Install dulu dengan perintah: pip install ultralytics")
    sys.exit(1)

def cari_model_default():
    folder_script = Path(__file__).resolve().parent
    kandidat = folder_script / "best.pt"
    if kandidat.exists():
        return str(kandidat)
    return None


def buat_folder_output(base_dir="runs/deteksi"):
    base_path = Path(base_dir)
    base_path.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    folder_baru = base_path / f"exp_{timestamp}"
    folder_baru.mkdir(parents=True, exist_ok=True)
    return folder_baru


def deteksi_mata(path_gambar, path_model, conf=0.25):
    if not Path(path_gambar).exists():
        print(f"Gambar tidak ditemukan: {path_gambar}")
        sys.exit(1)

    if not path_model or not Path(path_model).exists():
        print(f"Model tidak ditemukan: {path_model}")
        print("Pastikan path ke file best.pt sudah benar.")
        sys.exit(1)

    print(f"Memuat model: {path_model}")
    model = YOLO(path_model)

    folder_output = buat_folder_output()
    print(f"Folder hasil (terbaru): {folder_output}")

    print(f"Menjalankan deteksi pada gambar: {path_gambar}")
    hasil = model.predict(
        source=path_gambar,
        conf=conf,
        save=True,
        project=str(folder_output.parent),
        name=folder_output.name,
        exist_ok=True,
    )

    for r in hasil:
        nama_kelas = r.names
        print("\n=== Hasil Deteksi ===")
        if r.boxes is None or len(r.boxes) == 0:
            print("Tidak ada objek/kondisi mata yang terdeteksi.")
        else:
            for box in r.boxes:
                cls_id = int(box.cls[0])
                label = nama_kelas[cls_id]
                skor = float(box.conf[0])
                print(f"- {label} (keyakinan: {skor:.2%})")

    print(f"\nGambar hasil deteksi tersimpan di folder: {folder_output}")
    return folder_output

def main():
    parser = argparse.ArgumentParser(description="Deteksi kondisi mata dari gambar menggunakan model YOLO (best.pt)")
    parser.add_argument("gambar", nargs="?", default=GAMBAR_PATH, help="Path ke file gambar mata yang akan dideteksi")
    parser.add_argument("--conf", type=float, default=0.25, help="Ambang batas confidence (default 0.25)")
    args = parser.parse_args()

    path_model = MODEL_PATH or cari_model_default()
    deteksi_mata(args.gambar, path_model, args.conf)

if __name__ == "__main__":
    main()