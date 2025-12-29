from dataset import PlateDataset
from collate import collate_fn
from torch.utils.data import DataLoader

ds = PlateDataset(
    img_root="ocr_dataset/images",
    label_file="ocr_dataset/labels.txt",
    augment=False
)

dl = DataLoader(ds, batch_size=4, collate_fn=collate_fn)

imgs, labels, lens = next(iter(dl))
print(imgs.shape)      # (4,1,32,W)
print(labels)
print(lens)

