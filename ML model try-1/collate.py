import torch

def collate_fn(batch):
    images, labels = zip(*batch)

    batch_size = len(images)
    max_w = max(img.shape[2] for img in images)
    h = images[0].shape[1]

    padded = torch.zeros(batch_size, 1, h, max_w)

    for i, img in enumerate(images):
        padded[i, :, :, :img.shape[2]] = img

    label_lengths = torch.tensor([len(l) for l in labels], dtype=torch.long)
    labels = torch.cat(labels)

    return padded, labels, label_lengths
