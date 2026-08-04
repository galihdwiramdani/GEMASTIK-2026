import os
import csv
import time
import shutil
import torch
from PIL import Image, ImageDraw, ImageFont
from torchvision import transforms
from utils.frequentlynet import FrequentlyNet

def run_cnn(stop_event=None):
    MODEL_PATH = "models/best_frequentlynet.pth"

    WAITING_ORIGINAL = "waiting/original"
    WAITING_CROP = "waiting/crop"
    WAITING_BBOX = "waiting/bbox"

    PROCESSED_FOLDER = "processed"
    RESULT_FILE = "results/result.txt"
    LOG_FILE = "results/prediction_log.csv"
    CLASSES = ["Normal", "Katarak"]
    CATARACT_FULL_THRESHOLD = 88.0

    for label in CLASSES:
        os.makedirs(os.path.join(PROCESSED_FOLDER, label, "bbox"), exist_ok=True)

    os.makedirs("results", exist_ok=True)

    if not os.path.exists(LOG_FILE):
        with open(LOG_FILE, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["timestamp", "filename", "label", "confidence"])

    DEVICE = torch.device("cpu")

    model = FrequentlyNet(num_classes=2)
    state = torch.load(MODEL_PATH, map_location=DEVICE)
    model.load_state_dict(state)
    model.to(DEVICE)
    model.eval()
    print("FrequentlyNet Loaded Successfully")

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],
            std=[0.229, 0.224, 0.225]
        )
    ])

    print("CNN thread dimulai. Memantau folder:", WAITING_CROP)
    while True:
        if stop_event is not None and stop_event.is_set():
            break

        images = sorted(os.listdir(WAITING_CROP))
        images = [f for f in images if f.lower().endswith((".jpg", ".jpeg", ".png"))]

        if len(images) == 0:
            time.sleep(0.5)
            continue

        filename = images[0]
        crop_path = os.path.join(WAITING_CROP, filename)
        bbox_path = os.path.join(WAITING_BBOX, filename)
        original_path = os.path.join(WAITING_ORIGINAL, filename)

        if not _is_file_stable(crop_path):
            time.sleep(0.3)
            continue

        if not (os.path.exists(bbox_path) and os.path.exists(original_path)):
            time.sleep(0.2)
            continue

        try:
            img = Image.open(crop_path).convert("RGB")
            tensor = transform(img).unsqueeze(0).to(DEVICE)

            with torch.no_grad():
                output = model(tensor)
                prob = torch.softmax(output, dim=1)
                confidence, pred = torch.max(prob, 1)

            label = CLASSES[pred.item()]
            score = confidence.item() * 100
            timestamp = time.strftime("%Y-%m-%d %H:%M:%S")

            if label == "Katarak" and score < CATARACT_FULL_THRESHOLD:
                display_label = "Setengah Katarak"
            else:
                display_label = label

            print("-" * 40)
            print("Image      :", filename)
            print("Prediction :", display_label)
            print(f"Confidence : {score:.2f}%")
            print("-" * 40)

            with open(RESULT_FILE, "w") as f:
                f.write(f"Timestamp  : {timestamp}\n")
                f.write(f"Filename   : {filename}\n")
                f.write(f"Prediction : {display_label}\n")
                f.write(f"Confidence : {score:.2f}%\n")

            with open(LOG_FILE, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow([timestamp, filename, display_label, f"{score:.2f}"])

            _annotate_bbox(bbox_path, display_label, score)

            shutil.move(bbox_path, os.path.join(PROCESSED_FOLDER, label, "bbox", filename))
            os.remove(crop_path)
            os.remove(original_path)

        except Exception as e:
            print(f"[ERROR] Gagal memproses {filename}: {e}")
            time.sleep(1)

    print("CNN thread berhenti.")


def _is_file_stable(path, checks=2, interval=0.15):
    try:
        prev_size = -1
        for _ in range(checks):
            size = os.path.getsize(path)
            if size == prev_size and size > 0:
                return True
            prev_size = size
            time.sleep(interval)
        return prev_size == os.path.getsize(path) and prev_size > 0
    except OSError:
        return False


def _annotate_bbox(bbox_path, label, score):
    try:
        img = Image.open(bbox_path).convert("RGB")
        draw = ImageDraw.Draw(img)

        text = f"{label} ({score:.2f}%)"
        if label == "Normal":
            color = (0, 255, 0)        
        elif label == "Setengah Katarak":
            color = (255, 165, 0)      
        else:
            color = (255, 0, 0)        

        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except Exception:
            font = ImageFont.load_default()

        position = (10, img.height - 30)
        text_bbox = draw.textbbox(position, text, font=font)
        padded_box = (
            text_bbox[0] - 4,
            text_bbox[1] - 4,
            text_bbox[2] + 4,
            text_bbox[3] + 4
        )

        draw.rectangle(padded_box, fill=(0, 0, 0))
        draw.text(position, text, fill=color, font=font)

        img.save(bbox_path)
    except Exception as e:
        print(f"Gagal menambahkan label ke bbox: {e}")


if __name__ == "__main__":
    run_cnn()