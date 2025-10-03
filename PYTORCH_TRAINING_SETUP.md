# Real PyTorch Training Setup + AI Analysis

This guide explains how to set up and use the **real PyTorch backend** with **real AI image analysis** for training plant detection models.

## 🏗️ Architecture

- **Frontend**: React + TypeScript (uploads images to Supabase Storage)
- **Backend**: Python + FastAPI + PyTorch (real deep learning training + inference)
- **AI Analysis**: Lovable AI Gateway (Gemini 2.5 Flash) for real-time image analysis
- **Model**: ResNet18 transfer learning for plant classification
- **Deployment**: Docker containerized backend

## ✨ New Features

✅ **Real AI Image Analysis** - Each uploaded image analyzed by Gemini 2.5 Flash  
✅ **Real PyTorch Training** - Full backpropagation with ResNet18  
✅ **Real Inference** - Run predictions using trained models  
✅ **Model Export** - TorchScript and ONNX support

## 🚀 Quick Start

### 1. Start the PyTorch Backend

#### Option A: Using Docker (Recommended)

```bash
# Start the backend container
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop the backend
docker-compose down
```

The backend will be available at `http://localhost:8000`

#### Option B: Run Directly with Python

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn api:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Access the Training Interface

Navigate to: `http://localhost:3000/train-ai` in your browser

## 📋 Training Workflow

### Step 1: Upload Images with AI Analysis
Upload your plant and non-plant images:
- Go to the main dashboard
- Use the drag-and-drop interface to upload images
- **NEW**: Each image is automatically analyzed by Lovable AI (Gemini 2.5 Flash)
- AI identifies: plant type, health status, diseases, confidence scores
- Images organized in Supabase Storage with AI metadata

### Step 2: Prepare Dataset
1. Click **"Prepare Dataset from Storage"**
2. The system will:
   - Download all images from Supabase Storage
   - Create 80/20 train/validation split
   - Organize into proper folder structure
   - Create a ZIP file
   - Upload to the PyTorch backend

### Step 3: Configure Training
Set your hyperparameters:
- **Epochs**: Number of training iterations (default: 10)
- **Batch Size**: Images per training step (default: 16)
- **Image Size**: Input resolution (default: 224x224)

### Step 4: Start Training
1. Click **"Start Real Training"**
2. Watch real-time progress:
   - Current epoch and progress bar
   - Training loss (how well model fits training data)
   - Validation loss (how well model generalizes)
   - Device being used (CPU/CUDA GPU)

### Step 5: Export Model
Once training completes:
1. Click **"Export TorchScript"** or **"Export ONNX"**
2. Download the trained model from the list
3. Use the model for inference in your applications

## 🔧 Backend API Endpoints

### Analyze Image with AI (NEW)
```bash
POST /functions/v1/plant-image-analysis
Authorization: Bearer {supabase_access_token}
Content-Type: application/json

Body:
{
  "imageBase64": "data:image/jpeg;base64,..."
}

Response:
{
  "success": true,
  "analysis": {
    "isPlant": true,
    "plantType": "Tomato",
    "healthStatus": "disease",
    "disease": "Early Blight",
    "confidence": 0.92,
    "features": ["yellowing leaves", "brown spots", "wilting"]
  }
}
```

### Run Inference with Trained Model (NEW)
```bash
POST /predict
Content-Type: application/x-www-form-urlencoded

Body:
- image: base64 encoded image
- model_path: (optional) path to checkpoint

Response:
{
  "success": true,
  "prediction": "plant",
  "confidence": 0.94,
  "class_probabilities": {
    "plant": 0.94,
    "non_plant": 0.06
  },
  "inference_time": 45.2
}
```

### Upload Dataset
```bash
POST /upload-zip
Content-Type: multipart/form-data
Body: file (ZIP file with train/val folders)

Response:
{
  "status": "extracted",
  "data_dir": "/app/uploads/plant_dataset"
}
```

### Start Training
```bash
POST /train
Authorization: Bearer {admin_token}
Content-Type: application/x-www-form-urlencoded

Body:
- data_dir: path to dataset
- epochs: number of epochs
- batch_size: batch size
- img_size: image resolution

Response:
{
  "status": "started"
}
```

### Get Training Status
```bash
GET /status

Response:
{
  "status": "training",
  "epoch": 5,
  "last_loss": 0.234,
  "last_val_loss": 0.189,
  "device": "cuda",
  "classes": ["plant", "non_plant"]
}
```

### Export Model
```bash
POST /export
Authorization: Bearer {admin_token}
Content-Type: application/x-www-form-urlencoded

Body:
- format: "torchscript" or "onnx"

Response:
{
  "path": "/app/exports/model_1234567890.pt"
}
```

### List Models
```bash
GET /models

Response:
{
  "models": [
    {
      "name": "model_1234567890.pt",
      "path": "/app/exports/model_1234567890.pt",
      "size": 102400000
    }
  ]
}
```

### Download Model
```bash
GET /download/?path={encoded_path}

Response: Binary file download
```

## 🎯 Model Architecture

**Base Model**: ResNet-50 (pretrained on ImageNet)

```python
class TransferResNet(nn.Module):
    def __init__(self, num_classes=2):
        super().__init__()
        self.model = models.resnet50(pretrained=True)
        
        # Freeze early layers
        for param in list(self.model.parameters())[:-10]:
            param.requires_grad = False
        
        # Replace final layer
        in_features = self.model.fc.in_features
        self.model.fc = nn.Linear(in_features, num_classes)
```

**Training Details**:
- Optimizer: Adam
- Learning Rate: 1e-3
- Loss Function: CrossEntropyLoss
- Data Augmentation:
  - Random horizontal flip
  - Random rotation (±10°)
  - Color jitter (brightness, contrast, saturation)
  - Normalization with ImageNet statistics

## 📊 Dataset Structure

The backend expects this folder structure:

```
dataset/
├── train/
│   ├── plant/
│   │   ├── image1.jpg
│   │   ├── image2.jpg
│   │   └── ...
│   └── non_plant/
│       ├── image1.jpg
│       ├── image2.jpg
│       └── ...
└── val/
    ├── plant/
    │   ├── image1.jpg
    │   └── ...
    └── non_plant/
        ├── image1.jpg
        └── ...
```

## 🔐 Security

**Admin Token**: Set in `docker-compose.yml` or `.env` file

```bash
ADMIN_TOKEN=your_secure_token_here
```

Only requests with valid admin token can:
- Start training
- Stop training
- Export models

## 🐛 Troubleshooting

### Backend Not Starting
```bash
# Check if port 8000 is available
lsof -i :8000

# Check Docker logs
docker-compose logs backend
```

### CUDA Out of Memory
Reduce batch size:
```python
batch_size = 8  # or 4
```

### Dataset Not Found
Ensure images are uploaded to Supabase Storage first:
1. Go to main dashboard
2. Upload plant/non-plant images
3. Then prepare dataset in training interface

### Training Loss Not Decreasing
- Increase epochs (try 20-50)
- Adjust learning rate
- Check if dataset has good variety
- Ensure balanced classes (equal plant/non-plant images)

## 📈 Performance Tips

**For Faster Training**:
- Use GPU: Ensure CUDA is available (`torch.cuda.is_available()`)
- Increase batch size (if you have enough VRAM)
- Use fewer epochs with learning rate scheduling

**For Better Accuracy**:
- Upload more diverse training images (100+ per class)
- Balance your dataset (equal plant/non-plant)
- Use data augmentation (already included)
- Train for more epochs (20-50)

## 🎓 Export Formats

### TorchScript (.pt)
- Best for PyTorch deployment
- Preserves full model structure
- Can run without Python code
- Use with `torch.jit.load()`

### ONNX (.onnx)
- Cross-platform format
- Works with TensorFlow, PyTorch, etc.
- Optimized for production
- Use with ONNX Runtime

## 📝 Notes

- Training runs in background (non-blocking)
- Status updates every 2 seconds
- Models saved to `/backend/exports/`
- Checkpoints saved to `/backend/checkpoints/`
- All data persists in Docker volumes

## 🔗 Resources

- [PyTorch Documentation](https://pytorch.org/docs/)
- [ResNet Paper](https://arxiv.org/abs/1512.03385)
- [Transfer Learning Guide](https://pytorch.org/tutorials/beginner/transfer_learning_tutorial.html)
