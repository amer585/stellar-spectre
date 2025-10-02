import os
from pathlib import Path
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image


class ImageFolderDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = Path(root_dir)
        self.transform = transform
        self.images = []
        self.labels = []
        self.classes = []
        
        # Find all class directories
        for class_dir in sorted(self.root_dir.iterdir()):
            if class_dir.is_dir():
                class_name = class_dir.name
                if class_name not in self.classes:
                    self.classes.append(class_name)
                class_idx = self.classes.index(class_name)
                
                # Find all images in class directory
                for img_path in class_dir.glob('*'):
                    if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png', '.bmp', '.gif']:
                        self.images.append(img_path)
                        self.labels.append(class_idx)
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]
        
        image = Image.open(img_path).convert('RGB')
        
        if self.transform:
            image = self.transform(image)
        
        return image, label


def prepare_loaders(data_dir, batch_size=16, img_size=224, val_split=0.2):
    """
    Prepare train and validation dataloaders from a directory structure:
    data_dir/
        train/
            class1/
                img1.jpg
                img2.jpg
            class2/
                img1.jpg
                img2.jpg
        val/
            class1/
                img1.jpg
            class2/
                img1.jpg
    
    Or from a flat structure:
    data_dir/
        class1/
            img1.jpg
            img2.jpg
        class2/
            img1.jpg
            img2.jpg
    """
    data_path = Path(data_dir)
    
    # Define transforms
    train_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((img_size, img_size)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])
    
    # Check if train/val directories exist
    train_dir = data_path / 'train'
    val_dir = data_path / 'val'
    
    if train_dir.exists() and val_dir.exists():
        # Use existing train/val split
        train_dataset = ImageFolderDataset(train_dir, transform=train_transform)
        val_dataset = ImageFolderDataset(val_dir, transform=val_transform)
        classes = train_dataset.classes
    else:
        # Create train/val split from flat structure
        dataset = ImageFolderDataset(data_path, transform=train_transform)
        classes = dataset.classes
        
        # Split dataset
        train_size = int((1 - val_split) * len(dataset))
        val_size = len(dataset) - train_size
        
        from torch.utils.data import random_split
        train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
        
        # Apply validation transform to val_dataset
        val_dataset.dataset.transform = val_transform
    
    # Create dataloaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=4,
        pin_memory=True
    )
    
    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=4,
        pin_memory=True
    )
    
    return train_loader, val_loader, classes
