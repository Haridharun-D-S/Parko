import torch.nn as nn

class CRNN(nn.Module):
    def __init__(self, num_classes):
        super().__init__()

        # CNN: output must be (B, C, 1, W)
        self.cnn = nn.Sequential(
            nn.Conv2d(1, 64, 3, 1, 1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),          # (B,64,16,W/2)

            nn.Conv2d(64, 128, 3, 1, 1),
            nn.ReLU(),
            nn.MaxPool2d(2, 2),          # (B,128,8,W/4)

            nn.Conv2d(128, 256, 3, 1, 1),
            nn.ReLU(),

            nn.Conv2d(256, 256, 3, 1, 1),
            nn.ReLU(),
            nn.MaxPool2d((2, 1)),        # (B,256,4,W/4)

            nn.Conv2d(256, 512, 3, 1, 1),
            nn.BatchNorm2d(512),
            nn.ReLU(),

            nn.MaxPool2d((4, 1))         # (B,512,1,W/4)
        )

        # RNN (DO NOT use nn.Sequential for LSTM)
        self.lstm1 = nn.LSTM(
            input_size=512,
            hidden_size=256,
            bidirectional=True,
            batch_first=True
        )

        self.lstm2 = nn.LSTM(
            input_size=512,
            hidden_size=256,
            bidirectional=True,
            batch_first=True
        )

        self.fc = nn.Linear(512, num_classes)

    def forward(self, x):
        x = self.cnn(x)          # (B,512,1,W)
        x = x.squeeze(2)         # (B,512,W)
        x = x.permute(0, 2, 1)   # (B,W,512)

        x, _ = self.lstm1(x)
        x, _ = self.lstm2(x)

        x = self.fc(x)
        return x
