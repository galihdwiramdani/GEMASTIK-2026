import torch
from utils.frequentlynet import FrequentlyNet

model = FrequentlyNet(num_classes=2)
state = torch.load(
    "models/best_frequentlynet.pth",
    map_location="cpu"
)
model.load_state_dict(state)
model.eval()
print("FrequentlyNet berhasil dimuat.")
dummy = torch.randn(1,3,224,224)
with torch.no_grad():
    output = model(dummy)
print("Output Shape :", output.shape)