"""
FastAPI Server for wayway.ai AI Training
"""

import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import torch
from datetime import datetime
import json

from data.loader import DrawingDataLoader
from models.drawing_transformer import DrawingTransformer
from training.trainer import DrawingTrainer, prepare_dataloaders

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

app = FastAPI(title="wayway.ai AI Training API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state
training_jobs = {}
current_model = None
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


class TrainingRequest(BaseModel):
    max_drawings: Optional[int] = None
    num_epochs: int = 100
    batch_size: int = 16
    learning_rate: float = 0.0001
    email_notification: bool = True


class GenerationRequest(BaseModel):
    image_url: str
    prompt: Optional[str] = None
    max_length: int = 500
    temperature: float = 1.0


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "wayway.ai AI Training API",
        "version": "1.0.0",
        "device": str(device),
        "status": "running"
    }


@app.get("/status")
async def get_status():
    """Get system status"""
    return {
        "device": str(device),
        "cuda_available": torch.cuda.is_available(),
        "active_training_jobs": len([j for j in training_jobs.values() if j['status'] == 'running']),
        "completed_training_jobs": len([j for j in training_jobs.values() if j['status'] == 'completed']),
        "model_loaded": current_model is not None
    }


@app.post("/train")
async def start_training(request: TrainingRequest, background_tasks: BackgroundTasks):
    """
    Start a new training job

    Args:
        request: Training configuration

    Returns:
        Job ID and status
    """
    # Generate job ID
    job_id = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Initialize job
    training_jobs[job_id] = {
        'id': job_id,
        'status': 'queued',
        'progress': 0,
        'message': 'Training queued',
        'start_time': datetime.now().isoformat(),
        'config': request.dict()
    }

    # Start training in background
    background_tasks.add_task(
        run_training_job,
        job_id=job_id,
        config=request.dict()
    )

    return {
        'job_id': job_id,
        'status': 'queued',
        'message': 'Training job started. Check /training/{job_id} for progress.'
    }


@app.get("/training/{job_id}")
async def get_training_status(job_id: str):
    """Get training job status"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Job not found")

    return training_jobs[job_id]


@app.get("/training")
async def list_training_jobs():
    """List all training jobs"""
    return {
        'jobs': list(training_jobs.values()),
        'total': len(training_jobs)
    }


@app.post("/generate")
async def generate_drawing(request: GenerationRequest):
    """
    Generate a drawing from reference image

    Args:
        request: Generation configuration

    Returns:
        Generated stroke data
    """
    global current_model

    if current_model is None:
        raise HTTPException(status_code=400, detail="No model loaded. Train a model first.")

    try:
        # Load image
        import requests
        from PIL import Image
        from io import BytesIO
        from torchvision import transforms

        response = requests.get(request.image_url, timeout=10)
        image = Image.open(BytesIO(response.content)).convert('RGB')

        # Transform image
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

        image_tensor = transform(image).unsqueeze(0).to(device)

        # Generate strokes
        with torch.no_grad():
            generated_strokes = current_model.generate(
                images=image_tensor,
                max_length=request.max_length,
                temperature=request.temperature
            )

        # Convert to list
        strokes_list = generated_strokes.squeeze(1).cpu().numpy().tolist()

        return {
            'status': 'success',
            'strokes': strokes_list,
            'num_strokes': len(strokes_list)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@app.get("/model/info")
async def get_model_info():
    """Get information about the current model"""
    if current_model is None:
        return {'loaded': False}

    num_params = sum(p.numel() for p in current_model.parameters())

    return {
        'loaded': True,
        'num_parameters': num_params,
        'device': str(device)
    }


async def run_training_job(job_id: str, config: Dict[str, Any]):
    """
    Run training job (background task)

    Args:
        job_id: Job ID
        config: Training configuration
    """
    global current_model

    try:
        # Update status
        training_jobs[job_id]['status'] = 'running'
        training_jobs[job_id]['message'] = 'Loading data...'

        # Load data
        api_key = os.getenv('AIRTABLE_API_KEY')
        base_id = os.getenv('AIRTABLE_BASE_ID')

        loader = DrawingDataLoader(api_key, base_id)
        drawings = loader.load_all_training_data(max_drawings=config.get('max_drawings'))

        if len(drawings) == 0:
            training_jobs[job_id]['status'] = 'failed'
            training_jobs[job_id]['message'] = 'No training data found'
            return

        # Get statistics
        stats = loader.get_dataset_statistics(drawings)
        training_jobs[job_id]['dataset_stats'] = stats

        # Prepare dataloaders
        training_jobs[job_id]['message'] = 'Preparing data loaders...'
        train_loader, val_loader = prepare_dataloaders(
            drawings,
            batch_size=config['batch_size'],
            val_split=0.1
        )

        # Create model
        training_jobs[job_id]['message'] = 'Creating model...'
        model = DrawingTransformer(
            input_dim=6,
            output_dim=6,
            d_model=256,
            nhead=8,
            num_encoder_layers=6,
            num_decoder_layers=6
        )

        # Create trainer
        save_dir = f"./models/saved/{job_id}"
        trainer = DrawingTrainer(
            model=model,
            device=device,
            learning_rate=config['learning_rate'],
            save_dir=save_dir
        )

        # Train
        training_jobs[job_id]['message'] = 'Training model...'
        history = trainer.train(
            train_loader=train_loader,
            val_loader=val_loader,
            num_epochs=config['num_epochs'],
            save_every=10
        )

        # Update job with results
        training_jobs[job_id]['status'] = 'completed'
        training_jobs[job_id]['message'] = 'Training completed successfully'
        training_jobs[job_id]['end_time'] = datetime.now().isoformat()
        training_jobs[job_id]['history'] = history
        training_jobs[job_id]['final_train_loss'] = history['train_loss'][-1]
        training_jobs[job_id]['final_val_loss'] = history['val_loss'][-1]

        # Load trained model as current model
        current_model = model
        current_model.eval()

        # Send email notification if requested
        if config.get('email_notification'):
            await send_training_notification(job_id, history, stats)

    except Exception as e:
        training_jobs[job_id]['status'] = 'failed'
        training_jobs[job_id]['message'] = f'Training failed: {str(e)}'
        training_jobs[job_id]['error'] = str(e)


async def send_training_notification(job_id: str, history: Dict, stats: Dict):
    """
    Send email notification when training completes

    Args:
        job_id: Job ID
        history: Training history
        stats: Dataset statistics
    """
    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail

        api_key = os.getenv('SENDGRID_API_KEY')
        if not api_key:
            print("SendGrid API key not configured, skipping email notification")
            return

        from_email = os.getenv('FROM_EMAIL', 'wayway@ai.training')
        to_email = os.getenv('TO_EMAIL')

        if not to_email:
            print("TO_EMAIL not configured, skipping email notification")
            return

        # Create email content
        final_train_loss = history['train_loss'][-1]
        final_val_loss = history['val_loss'][-1]
        improvement = ((history['train_loss'][0] - final_train_loss) / history['train_loss'][0]) * 100

        message = Mail(
            from_email=from_email,
            to_emails=to_email,
            subject=f'AI Training Complete - Job {job_id}',
            html_content=f'''
            <h2>Your AI Drawing Model Just Got Smarter!</h2>

            <h3>Training Summary</h3>
            <ul>
                <li>Job ID: {job_id}</li>
                <li>Drawings processed: {stats["total_drawings"]}</li>
                <li>Total strokes: {stats["total_strokes"]}</li>
                <li>Final train loss: {final_train_loss:.6f}</li>
                <li>Final validation loss: {final_val_loss:.6f}</li>
                <li>Improvement: {improvement:.1f}%</li>
            </ul>

            <h3>Dataset Info</h3>
            <ul>
                <li>Avg strokes per drawing: {stats["avg_strokes_per_drawing"]:.1f}</li>
                <li>Drawings with images: {stats["drawings_with_reference_images"]}</li>
                <li>Drawings with voice: {stats["drawings_with_voice_annotations"]}</li>
            </ul>

            <h3>Next Steps</h3>
            <p>Your model is now loaded and ready to generate drawings!</p>
            <p>Try the generation endpoint: <code>POST /generate</code></p>

            <p><a href="http://localhost:8000/training/{job_id}">View Full Training Report</a></p>
            '''
        )

        sg = SendGridAPIClient(api_key)
        response = sg.send(message)

        print(f"Email notification sent: {response.status_code}")

    except Exception as e:
        print(f"Failed to send email notification: {e}")


if __name__ == '__main__':
    import uvicorn

    port = int(os.getenv('API_PORT', 8000))
    host = os.getenv('API_HOST', '0.0.0.0')

    print(f"Starting wayway.ai AI Training API on {host}:{port}")
    print(f"Device: {device}")

    uvicorn.run(app, host=host, port=port)
