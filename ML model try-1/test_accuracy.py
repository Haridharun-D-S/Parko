import torch
import cv2
import numpy as np
import re
from model import CRNN
from tqdm import tqdm
import editdistance

# ---------------- CONFIG ----------------
MODEL_PATH = "crnn_plate_ocr.pth"
DATASET_ROOT = "ocr_dataset/images"
LABEL_FILE = "ocr_dataset/labels.txt"
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
idx2char = {i + 1: c for i, c in enumerate(CHARS)}

# ---------------- PREPROCESS ----------------
def resize_keep_ratio(img, height=32):
    h, w = img.shape
    scale = height / h
    new_w = int(w * scale)
    return cv2.resize(img, (new_w, height))

def preprocess_image(path):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    img = resize_keep_ratio(img)
    img = img.astype(np.float32) / 255.0
    img = torch.tensor(img).unsqueeze(0).unsqueeze(0)
    return img

# ---------------- CTC DECODE ----------------
def ctc_decode(preds):
    preds = preds.argmax(2)
    texts = []

    for p in preds:
        prev = -1
        s = ""
        for c in p:
            c = c.item()
            if c != prev and c != 0:
                s += idx2char[c]
            prev = c
        texts.append(s)

    return texts

# ---------------- SAFE PLATE VALIDATION ----------------
def normalize_plate(text):
    text = text.replace(" ", "").upper()

    # ONLY strip non-alphanumerics
    text = re.sub(r"[^A-Z0-9]", "", text)

    return text

# ---------------- METRICS ----------------
def char_accuracy(gt, pred):
    dist = editdistance.eval(gt, pred)
    return 1 - dist / max(len(gt), len(pred))

def cer(gt, pred):
    return editdistance.eval(gt, pred) / len(gt)

# ---------------- LOAD MODEL ----------------
model = CRNN(num_classes=37)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()

# ---------------- LOAD LABELS ----------------
samples = []
with open(LABEL_FILE) as f:
    for line in f:
        img, label = line.strip().split()
        samples.append((img, label))

# ---------------- EVALUATION ----------------
exact_match = 0
char_acc_total = 0
cer_total = 0

print("Running corrected accuracy test...\n")

for img_name, gt in tqdm(samples):
    img_path = f"{DATASET_ROOT}/{img_name}"
    img = preprocess_image(img_path).to(DEVICE)

    with torch.no_grad():
        logits = model(img)
        raw_pred = ctc_decode(logits)[0]

    pred = normalize_plate(raw_pred)

    if pred == gt:
        exact_match += 1

    char_acc_total += char_accuracy(gt, pred)
    cer_total += cer(gt, pred)

total = len(samples)

print("\n========== OCR ACCURACY REPORT ==========")
print(f"Total Samples        : {total}")
print(f"Exact Plate Accuracy : {(exact_match / total) * 100:.2f}%")
print(f"Avg Character Acc    : {(char_acc_total / total) * 100:.2f}%")
print(f"Avg CER              : {cer_total / total:.4f}")
print("========================================")
