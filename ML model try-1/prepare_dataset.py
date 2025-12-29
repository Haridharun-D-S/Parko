import os
import shutil

SOURCE_ROOT = "generated"
TARGET_IMG = "ocr_dataset/images"
LABEL_FILE = "ocr_dataset/labels.txt"

os.makedirs(TARGET_IMG, exist_ok=True)

label_lines = []
img_id = 0

for root, dirs, files in os.walk(SOURCE_ROOT):
    for file in files:
        if file.lower().endswith((".jpg", ".png", ".jpeg")):
            plate_text = os.path.splitext(file)[0].upper()

            # skip invalid filenames
            if not plate_text.isalnum():
                continue

            src = os.path.join(root, file)
            new_name = f"{img_id:07d}.jpg"
            dst = os.path.join(TARGET_IMG, new_name)

            shutil.copy(src, dst)
            label_lines.append(f"{new_name} {plate_text}\n")

            img_id += 1

with open(LABEL_FILE, "w") as f:
    f.writelines(label_lines)

print(f"✅ Done. Total images: {img_id}")
