import cv2
import torch
import numpy as np
from torch.utils.data import Dataset
from augment import augmenter

CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
char2idx = {c: i+1 for i, c in enumerate(CHARS)}

def resize_keep_ratio(img, height=32):
    h, w = img.shape
    scale = height / h
    new_w = int(w * scale)
    return cv2.resize(img, (new_w, height))

class PlateDataset(Dataset):
    def __init__(self, img_root, label_file, augment=False):
        self.img_root = img_root
        self.augment = augment
        self.samples = []

        with open(label_file) as f:
            for line in f:
                img, label = line.strip().split()
                self.samples.append((img, label))

    def encode(self, text):
        return torch.tensor([char2idx[c] for c in text], dtype=torch.long)

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_name, label = self.samples[idx]
        path = f"{self.img_root}/{img_name}"

        img = cv2.imread(path, cv2.IMREAD_GRAYSCALE)
        img = resize_keep_ratio(img)

        if self.augment:
            img = augmenter(image=img)["image"]

        img = img.astype(np.float32) / 255.0
        img = torch.tensor(img).unsqueeze(0)

        return img, self.encode(label)
