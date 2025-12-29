import torch
import cv2
import re
import numpy as np
from model import CRNN

# ---------------- CONFIG ----------------
MODEL_PATH = "crnn_plate_ocr.pth"
IMG_PATH = "ocr_dataset/images/np1.jpg"   # change this
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
idx2char = {i + 1: c for i, c in enumerate(CHARS)}

# ---------------- PREPROCESS ----------------
def resize_keep_ratio(img, height=32):
    h, w = img.shape
    scale = height / h
    new_w = int(w * scale)
    img = cv2.resize(img, (new_w, height))
    return img

def preprocess_image(path):
    img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        raise ValueError("Image not found")

    img = resize_keep_ratio(img)
    img = img.astype(np.float32) / 255.0
    img = torch.tensor(img).unsqueeze(0).unsqueeze(0)
    return img

# ---------------- CTC GREEDY DECODER ----------------
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

# ---------------- REGEX CLEANUP ----------------
def indian_plate_cleanup(text):
    text = text.replace(" ", "").upper()

    # common OCR confusions
    text = text.replace("O", "0")
    text = text.replace("I", "1")
    text = text.replace("Z", "2")
    text = text.replace("B", "8")

    pattern = r"[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}"
    match = re.findall(pattern, text)

    return match[0] if match else text

# ---------------- LOAD MODEL ----------------
model = CRNN(num_classes=37)
model.load_state_dict(torch.load(MODEL_PATH, map_location=DEVICE))
model.to(DEVICE)
model.eval()

# ---------------- RUN OCR ----------------
img = preprocess_image(IMG_PATH).to(DEVICE)

with torch.no_grad():
    logits = model(img)
    text = ctc_decode(logits)[0]
    final_text = indian_plate_cleanup(text)

print("Raw OCR Output :", text)
print("Final Plate   :", final_text)
