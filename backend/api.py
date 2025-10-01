
import os
import zipfile
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from train import Trainer
import dotenv

dotenv.load_dotenv()

ROOT = Path(__file__).parent
UPLOADS = ROOT / 'uploads'
UPLOADS.mkdir(exist_ok=True)

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TRAINER = {'instance': None, 'thread': None}
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN', 'changeme')


def require_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail='Missing Authorization header')
    if not authorization.lower().startswith('bearer '):
        raise HTTPException(status_code=401, detail='Invalid Authorization header')
    token = authorization.split(' ', 1)[1]
    if token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail='Invalid token')


@app.post('/upload-zip')
async def upload_zip(file: UploadFile = File(...)):
    filename = file.filename
    dest = UPLOADS / filename
    with open(dest, 'wb') as f:
        shutil.copyfileobj(file.file, f)

    extract_dir = UPLOADS / Path(filename).stem
    extract_dir.mkdir(exist_ok=True)
    with zipfile.ZipFile(dest, 'r') as z:
        for member in z.namelist():
            member_path = extract_dir / member
            if not str(member_path.resolve()).startswith(str(extract_dir.resolve())):
                raise HTTPException(status_code=400, detail='Bad zip file')
        z.extractall(path=extract_dir)

    return {'status': 'extracted', 'data_dir': str(extract_dir)}


@app.post('/train')
def start_train(
    data_dir: str = Form(...),
    epochs: int = Form(5),
    batch_size: int = Form(16),
    img_size: int = Form(224),
    authorization: str = Header(None)
):
    require_token(authorization)
    if TRAINER.get('thread') and TRAINER['thread'].is_alive():
        return {'status': 'busy'}

    if not Path(data_dir).exists():
        raise HTTPException(status_code=400, detail='data_dir not found')

    t = Trainer(data_dir, epochs=epochs, batch_size=batch_size, img_size=img_size)
    TRAINER['instance'] = t
    thread = t.start_background()
    TRAINER['thread'] = thread
    return {'status': 'started'}


@app.get('/status')
def status():
    t = TRAINER.get('instance')
    if not t:
        return {'status': 'idle'}
    return t.state


@app.post('/export')
def export(format: str = Form('torchscript'), authorization: str = Header(None)):
    require_token(authorization)
    t = TRAINER.get('instance')
    if not t:
        raise HTTPException(status_code=400, detail='no model')
    if format == 'torchscript':
        path = t.export_torchscript()
    elif format == 'onnx':
        path = t.export_onnx()
    else:
        raise HTTPException(status_code=400, detail='unknown format')
    return {'path': path}


@app.get('/download/')
def download(path: str):
    p = Path(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail='file not found')
    return FileResponse(str(p), media_type='application/octet-stream', filename=p.name)


@app.get('/models')
def list_models():
    ex = (ROOT / 'exports')
    ex.mkdir(exist_ok=True)
    items = []
    for f in ex.iterdir():
        items.append({'name': f.name, 'path': str(f), 'size': f.stat().st_size})
    return {'models': items}


@app.post('/stop')
def stop_training(authorization: str = Header(None)):
    require_token(authorization)
    t = TRAINER.get('instance')
    if not t:
        return {'status': 'no job'}
    t.stop()
    return {'status': 'stopping'}
