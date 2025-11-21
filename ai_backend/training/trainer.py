"""
Training Pipeline for Drawing Transformer
"""

import os
import json
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
import numpy as np
from PIL import Image
from tqdm import tqdm

from models.drawing_transformer import DrawingTransformer


class DrawingDataset(Dataset):
    """PyTorch Dataset for drawing data"""

    def __init__(
        self,
        drawings: List[Dict[str, Any]],
        max_seq_length: int = 500,
        image_size: Tuple[int, int] = (224, 224)
    ):
        self.drawings = [d for d in drawings if d['strokes'] is not None and len(d['strokes']) > 0]
        self.max_seq_length = max_seq_length
        self.image_size = image_size

        # Image transforms
        self.image_transform = transforms.Compose([
            transforms.Resize(image_size),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])

    def __len__(self) -> int:
        return len(self.drawings)

    def __getitem__(self, idx: int) -> Dict[str, torch.Tensor]:
        drawing = self.drawings[idx]

        # Get strokes
        strokes = drawing['strokes']  # [N, 6]

        # Normalize coordinates to [0, 1]
        strokes_norm = strokes.copy()
        if len(strokes_norm) > 0:
            # Normalize x and y
            x_min, x_max = strokes_norm[:, 0].min(), strokes_norm[:, 0].max()
            y_min, y_max = strokes_norm[:, 1].min(), strokes_norm[:, 1].max()

            if x_max > x_min:
                strokes_norm[:, 0] = (strokes_norm[:, 0] - x_min) / (x_max - x_min)
            if y_max > y_min:
                strokes_norm[:, 1] = (strokes_norm[:, 1] - y_min) / (y_max - y_min)

        # Truncate or pad to max_seq_length
        seq_len = min(len(strokes_norm), self.max_seq_length)
        padded_strokes = np.zeros((self.max_seq_length, 6), dtype=np.float32)
        padded_strokes[:seq_len] = strokes_norm[:seq_len]

        # Create padding mask (True for padding positions)
        padding_mask = np.ones(self.max_seq_length, dtype=bool)
        padding_mask[:seq_len] = False

        # Get reference image
        if drawing['reference_image'] is not None:
            image = drawing['reference_image']
            image_tensor = self.image_transform(image)
        else:
            # Create blank image if no reference
            image_tensor = torch.zeros(3, *self.image_size)

        return {
            'strokes': torch.from_numpy(padded_strokes),
            'padding_mask': torch.from_numpy(padding_mask),
            'image': image_tensor,
            'seq_len': seq_len,
            'drawing_id': drawing['id']
        }


class DrawingTrainer:
    """Trainer for Drawing Transformer"""

    def __init__(
        self,
        model: DrawingTransformer,
        device: torch.device,
        learning_rate: float = 0.0001,
        save_dir: str = './models/saved'
    ):
        self.model = model.to(device)
        self.device = device
        self.save_dir = save_dir

        os.makedirs(save_dir, exist_ok=True)

        # Optimizer
        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=learning_rate,
            betas=(0.9, 0.98),
            eps=1e-9,
            weight_decay=0.01
        )

        # Learning rate scheduler
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer,
            mode='min',
            factor=0.5,
            patience=5,
            verbose=True
        )

        # Loss function (MSE for continuous values)
        self.criterion = nn.MSELoss(reduction='none')

        # Training history
        self.history = {
            'train_loss': [],
            'val_loss': [],
            'learning_rates': []
        }

    def train_epoch(self, dataloader: DataLoader) -> float:
        """Train for one epoch"""
        self.model.train()
        total_loss = 0.0
        num_batches = 0

        pbar = tqdm(dataloader, desc='Training')
        for batch in pbar:
            # Move to device
            images = batch['image'].to(self.device)
            strokes = batch['strokes'].to(self.device)
            padding_mask = batch['padding_mask'].to(self.device)

            # Prepare target (shift by one for teacher forcing)
            # Input: [0, s1, s2, ..., sN-1]
            # Target: [s1, s2, s3, ..., sN]
            tgt_input = strokes[:-1].transpose(0, 1)  # [seq_len-1, batch, 6]
            tgt_output = strokes[1:].transpose(0, 1)  # [seq_len-1, batch, 6]
            tgt_padding_mask = padding_mask[:, 1:]  # [batch, seq_len-1]

            # Forward pass
            self.optimizer.zero_grad()
            predictions = self.model(
                images=images,
                tgt_strokes=tgt_input,
                tgt_key_padding_mask=tgt_padding_mask
            )

            # Calculate loss (ignore padding positions)
            loss = self.criterion(predictions, tgt_output)

            # Mask out padding
            mask = ~tgt_padding_mask.unsqueeze(0).expand_as(loss.transpose(0, 1)).transpose(0, 1)
            loss = (loss * mask).sum() / mask.sum()

            # Backward pass
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
            self.optimizer.step()

            total_loss += loss.item()
            num_batches += 1

            pbar.set_postfix({'loss': loss.item()})

        return total_loss / num_batches

    @torch.no_grad()
    def validate(self, dataloader: DataLoader) -> float:
        """Validate the model"""
        self.model.eval()
        total_loss = 0.0
        num_batches = 0

        pbar = tqdm(dataloader, desc='Validation')
        for batch in pbar:
            # Move to device
            images = batch['image'].to(self.device)
            strokes = batch['strokes'].to(self.device)
            padding_mask = batch['padding_mask'].to(self.device)

            # Prepare target
            tgt_input = strokes[:-1].transpose(0, 1)
            tgt_output = strokes[1:].transpose(0, 1)
            tgt_padding_mask = padding_mask[:, 1:]

            # Forward pass
            predictions = self.model(
                images=images,
                tgt_strokes=tgt_input,
                tgt_key_padding_mask=tgt_padding_mask
            )

            # Calculate loss
            loss = self.criterion(predictions, tgt_output)

            # Mask out padding
            mask = ~tgt_padding_mask.unsqueeze(0).expand_as(loss.transpose(0, 1)).transpose(0, 1)
            loss = (loss * mask).sum() / mask.sum()

            total_loss += loss.item()
            num_batches += 1

            pbar.set_postfix({'loss': loss.item()})

        return total_loss / num_batches

    def train(
        self,
        train_loader: DataLoader,
        val_loader: Optional[DataLoader] = None,
        num_epochs: int = 100,
        save_every: int = 10
    ) -> Dict[str, List[float]]:
        """
        Train the model

        Args:
            train_loader: Training data loader
            val_loader: Validation data loader (optional)
            num_epochs: Number of epochs to train
            save_every: Save checkpoint every N epochs

        Returns:
            Training history dictionary
        """
        print(f"Starting training for {num_epochs} epochs...")
        print(f"Device: {self.device}")
        print(f"Model parameters: {sum(p.numel() for p in self.model.parameters()):,}")

        best_val_loss = float('inf')

        for epoch in range(num_epochs):
            print(f"\nEpoch {epoch + 1}/{num_epochs}")

            # Train
            train_loss = self.train_epoch(train_loader)
            self.history['train_loss'].append(train_loss)
            self.history['learning_rates'].append(self.optimizer.param_groups[0]['lr'])

            print(f"Train Loss: {train_loss:.6f}")

            # Validate
            if val_loader is not None:
                val_loss = self.validate(val_loader)
                self.history['val_loss'].append(val_loss)
                print(f"Val Loss: {val_loss:.6f}")

                # Update learning rate
                self.scheduler.step(val_loss)

                # Save best model
                if val_loss < best_val_loss:
                    best_val_loss = val_loss
                    self.save_checkpoint('best_model.pt', epoch, val_loss)
                    print(f"Saved best model (val_loss: {val_loss:.6f})")

            # Save periodic checkpoint
            if (epoch + 1) % save_every == 0:
                self.save_checkpoint(f'checkpoint_epoch_{epoch+1}.pt', epoch, train_loss)

        # Save final model
        self.save_checkpoint('final_model.pt', num_epochs, train_loss)
        self.save_history()

        return self.history

    def save_checkpoint(self, filename: str, epoch: int, loss: float):
        """Save model checkpoint"""
        filepath = os.path.join(self.save_dir, filename)
        torch.save({
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'scheduler_state_dict': self.scheduler.state_dict(),
            'loss': loss,
            'history': self.history
        }, filepath)

    def load_checkpoint(self, filename: str) -> Tuple[int, float]:
        """Load model checkpoint"""
        filepath = os.path.join(self.save_dir, filename)
        checkpoint = torch.load(filepath, map_location=self.device)

        self.model.load_state_dict(checkpoint['model_state_dict'])
        self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        self.scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
        self.history = checkpoint.get('history', self.history)

        return checkpoint['epoch'], checkpoint['loss']

    def save_history(self):
        """Save training history"""
        filepath = os.path.join(self.save_dir, 'training_history.json')
        with open(filepath, 'w') as f:
            json.dump(self.history, f, indent=2)


def prepare_dataloaders(
    drawings: List[Dict[str, Any]],
    batch_size: int = 16,
    val_split: float = 0.1,
    max_seq_length: int = 500
) -> Tuple[DataLoader, DataLoader]:
    """
    Prepare training and validation data loaders

    Args:
        drawings: List of drawing data
        batch_size: Batch size
        val_split: Validation split ratio
        max_seq_length: Maximum sequence length

    Returns:
        (train_loader, val_loader)
    """
    # Split data
    n_val = int(len(drawings) * val_split)
    val_drawings = drawings[:n_val]
    train_drawings = drawings[n_val:]

    print(f"Train drawings: {len(train_drawings)}")
    print(f"Val drawings: {len(val_drawings)}")

    # Create datasets
    train_dataset = DrawingDataset(train_drawings, max_seq_length=max_seq_length)
    val_dataset = DrawingDataset(val_drawings, max_seq_length=max_seq_length)

    # Create data loaders
    train_loader = DataLoader(
        train_dataset,
        batch_size=batch_size,
        shuffle=True,
        num_workers=2,
        pin_memory=True
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=batch_size,
        shuffle=False,
        num_workers=2,
        pin_memory=True
    )

    return train_loader, val_loader


if __name__ == '__main__':
    # Test training pipeline
    print("Testing training pipeline...")

    # Create dummy data
    dummy_drawings = []
    for i in range(10):
        dummy_drawings.append({
            'id': f'test_{i}',
            'strokes': np.random.randn(100, 6).astype(np.float32),
            'reference_image': Image.new('RGB', (640, 640)),
            'artist': 'test'
        })

    # Create dataloaders
    train_loader, val_loader = prepare_dataloaders(
        dummy_drawings,
        batch_size=2,
        val_split=0.2
    )

    # Create model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = DrawingTransformer(
        input_dim=6,
        output_dim=6,
        d_model=128,
        nhead=4,
        num_encoder_layers=2,
        num_decoder_layers=2
    )

    # Create trainer
    trainer = DrawingTrainer(
        model=model,
        device=device,
        learning_rate=0.001
    )

    # Train for 2 epochs
    history = trainer.train(
        train_loader=train_loader,
        val_loader=val_loader,
        num_epochs=2,
        save_every=1
    )

    print("\nTraining test completed!")
    print(f"Final train loss: {history['train_loss'][-1]:.6f}")
    print(f"Final val loss: {history['val_loss'][-1]:.6f}")
