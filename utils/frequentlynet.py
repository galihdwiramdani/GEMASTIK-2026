import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiScaleBlock(nn.Module):

    def __init__(self, in_channels, out_channels):
        super().__init__()

        self.conv3 = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=3,
            padding=1
        )

        self.conv5 = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=5,
            padding=2
        )

        self.bn = nn.BatchNorm2d(out_channels * 2)

    def forward(self, x):

        x1 = self.conv3(x)

        x2 = self.conv5(x)

        out = torch.cat([x1, x2], dim=1)

        out = self.bn(out)

        return F.relu(out)

class DepthwiseConv(nn.Module):

    def __init__(self, in_channels, out_channels):
        super().__init__()

        self.depth = nn.Conv2d(
            in_channels,
            in_channels,
            kernel_size=3,
            padding=1,
            groups=in_channels,
            bias=False
        )

        self.point = nn.Conv2d(
            in_channels,
            out_channels,
            kernel_size=1,
            bias=False
        )

        self.bn = nn.BatchNorm2d(out_channels)

    def forward(self, x):

        x = self.depth(x)

        x = self.point(x)

        x = self.bn(x)

        return F.relu(x)

class SpatialAttention(nn.Module):

    def __init__(self):
        super().__init__()

        self.conv = nn.Conv2d(
            2,
            1,
            kernel_size=7,
            padding=3
        )

    def forward(self, x):

        avg = torch.mean(x, dim=1, keepdim=True)

        mx, _ = torch.max(x, dim=1, keepdim=True)

        out = torch.cat([avg, mx], dim=1)

        out = torch.sigmoid(self.conv(out))

        return x * out

class SEBlock(nn.Module):

    def __init__(self, channels, reduction=8):
        super().__init__()

        self.pool = nn.AdaptiveAvgPool2d(1)

        self.fc = nn.Sequential(

            nn.Linear(channels, channels // reduction),

            nn.ReLU(inplace=True),

            nn.Linear(channels // reduction, channels),

            nn.Sigmoid()

        )

    def forward(self, x):

        b, c, _, _ = x.size()

        y = self.pool(x).view(b, c)

        y = self.fc(y).view(b, c, 1, 1)

        return x * y

class FrequentlyBlock(nn.Module):

    def __init__(self, in_channels, out_channels):

        super().__init__()

        self.multi = MultiScaleBlock(
            in_channels,
            out_channels // 2
        )

        self.depth = DepthwiseConv(
            out_channels,
            out_channels
        )

        self.se = SEBlock(out_channels)

        self.sa = SpatialAttention()

        if in_channels != out_channels:

            self.short = nn.Conv2d(
                in_channels,
                out_channels,
                kernel_size=1
            )

        else:

            self.short = nn.Identity()

    def forward(self, x):

        shortcut = self.short(x)

        out = self.multi(x)

        out = self.depth(out)

        out = self.se(out)

        out = self.sa(out)

        out = out + shortcut

        return F.relu(out)

class FrequentlyNet(nn.Module):

    def __init__(self, num_classes=3):

        super().__init__()

        self.stem = nn.Sequential(

            nn.Conv2d(
                3,
                32,
                kernel_size=3,
                padding=1
            ),

            nn.BatchNorm2d(32),

            nn.ReLU()

        )

        self.layer1 = FrequentlyBlock(32, 32)

        self.layer2 = FrequentlyBlock(32, 64)

        self.pool1 = nn.MaxPool2d(2)

        self.layer3 = FrequentlyBlock(64, 128)

        self.layer4 = FrequentlyBlock(128, 256)

        self.pool2 = nn.AdaptiveAvgPool2d(1)

        self.dropout = nn.Dropout(0.5)

        self.fc = nn.Linear(256, num_classes)

    def forward(self, x):

        x = self.stem(x)

        x = self.layer1(x)

        x = self.layer2(x)

        x = self.pool1(x)

        x = self.layer3(x)

        x = self.layer4(x)

        x = self.pool2(x)

        x = torch.flatten(x, 1)

        x = self.dropout(x)

        x = self.fc(x)

        return x