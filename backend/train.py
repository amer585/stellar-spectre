import os
import time
import json
import threading
from pathlib import Path
import torch
from torch import nn, optim
from dataset import prepare_loaders
# ✅ updated to match new filename
from ai_model import TransferResNet

ROOT = Path(__file__).parent
CHECKPOINT_DIR = ROOT / 'checkpoints'
EXPORT_DIR = ROOT / 'exports'
UPLOADS_DIR = ROOT / 'uploads'
CHECKPOINT_DIR.mkdir(exist_ok=True)
EXPORT_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

class Trainer:
    def __init__(self, data_dir, epochs=5, batch_size=16, lr=1e-3, img_size=224, device=None):
        self.data_dir = data_dir
        self.epochs = int(epochs)
        self.batch_size = int(batch_size)
        self.lr = float(lr)
        self.img_size = int(img_size)
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')

        self.train_loader, self.val_loader, self.classes = prepare_loaders(
            data_dir, batch_size=self.batch_size, img_size=self.img_size
        )
        self.model = TransferResNet(num_classes=len(self.classes)).to(self.device)
        self.criterion = nn.CrossEntropyLoss()
        self.opt = optim.Adam(self.model.parameters(), lr=self.lr)

        self.state = {
            'status': 'initialized',
            'epoch': 0,
            'last_loss': None,
            'last_val_loss': None,
            'device': self.device,
            'classes': self.classes,
        }
        self._stop = False

    def train(self):
        self.state['status'] = 'training'
        for epoch in range(1, self.epochs + 1):
            if self._stop:
                self.state['status'] = 'stopped'
                break
            self.state['epoch'] = epoch
            running_loss = 0.0
            self.model.train()
            for i, (x, y) in enumerate(self.train_loader, 1):
                x, y = x.to(self.device), y.to(self.device)
                self.opt.zero_grad()
                out = self.model(x)
                loss = self.criterion(out, y)
                loss.backward()
                self.opt.step()
                running_loss += loss.item()
                self.state['last_loss'] = loss.item()

            avg_train = running_loss / len(self.train_loader)
            val_loss = self._validate()
            self.state['last_val_loss'] = val_loss

            ckpt_path = CHECKPOINT_DIR / f'ckpt_epoch_{epoch}.pth'
            torch.save(
                {'epoch': epoch, 'model_state': self.model.state_dict(), 'classes': self.classes},
                ckpt_path
            )

            meta = {
                'epoch': epoch,
                'train_loss': avg_train,
                'val_loss': val_loss,
                'timestamp': time.time(),
                'classes': self.classes,
            }
            with open(CHECKPOINT_DIR / f'ckpt_epoch_{epoch}.json', 'w') as f:
                json.dump(meta, f)

        if not self._stop:
            self.state['status'] = 'finished'

    def _validate(self):
        self.model.eval()
        running = 0.0
        with torch.no_grad():
            for x, y in self.val_loader:
                x, y = x.to(self.device), y.to(self.device)
                out = self.model(x)
                loss = self.criterion(out, y)
                running += loss.item()
        return running / len(self.val_loader)

    def start_background(self):
        th = threading.Thread(target=self.train, daemon=True)
        th.start()
        return th

    def stop(self):
        self._stop = True

    def export_torchscript(self, out_name=None):
        self.model.eval()
        out_name = out_name or f'model_{int(time.time())}.pt'
        out_path = EXPORT_DIR / out_name
        dummy = torch.randn(1, 3, self.img_size, self.img_size).to(self.device)
        traced = torch.jit.trace(self.model, dummy)
        traced.save(out_path)
        return str(out_path)

    def export_onnx(self, out_name=None):
        self.model.eval()
        out_name = out_name or f'model_{int(time.time())}.onnx'
        out_path = EXPORT_DIR / out_name
        dummy = torch.randn(1, 3, self.img_size, self.img_size).to(self.device)
        torch.onnx.export(
            self.model, dummy, str(out_path),
            input_names=['input'], output_names=['output'], opset_version=11
        )
        return str(out_path)

