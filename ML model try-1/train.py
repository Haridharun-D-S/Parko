import torch
from torch.utils.data import DataLoader
from dataset import PlateDataset
from model import CRNN
from collate import collate_fn

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
print("Using device:", DEVICE)

dataset = PlateDataset(
    img_root="ocr_dataset/images",
    label_file="ocr_dataset/labels.txt",
    augment=True
)

loader = DataLoader(
    dataset,
    batch_size=8,
    shuffle=True,
    collate_fn=collate_fn,
    num_workers=0
)

model = CRNN(num_classes=37).to(DEVICE)
criterion = torch.nn.CTCLoss(blank=0, zero_infinity=True)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

EPOCHS = 12

for epoch in range(EPOCHS):
    model.train()
    total_loss = 0.0
    steps = 0

    print(f"\nEpoch {epoch+1} started")

    for step, (imgs, labels, label_lengths) in enumerate(loader):
        imgs = imgs.to(DEVICE)
        labels = labels.to(DEVICE)
        label_lengths = label_lengths.to(DEVICE)

        logits = model(imgs)
        log_probs = logits.log_softmax(2)

        input_lengths = torch.full(
            (logits.size(0),),
            logits.size(1),
            dtype=torch.long
        ).to(DEVICE)

        loss = criterion(
            log_probs.permute(1, 0, 2),
            labels,
            input_lengths,
            label_lengths
        )

        optimizer.zero_grad()
        loss.backward()
        optimizer.step()

        total_loss += loss.item()
        steps += 1

        if step % 20 == 0:
            print(f"  Step {step} | Loss {loss.item():.4f}")

    avg_loss = total_loss / steps
    print(f"Epoch {epoch+1} finished | Avg Loss {avg_loss:.4f}")

torch.save(model.state_dict(), "crnn_plate_ocr.pth")
print("✅ Model saved")
