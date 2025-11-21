"""
Drawing Transformer Model
Learns to generate stroke sequences from reference images and optional text context
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import math
from typing import Optional, Tuple

class PositionalEncoding(nn.Module):
    """Positional encoding for transformer"""

    def __init__(self, d_model: int, max_len: int = 5000):
        super().__init__()

        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))

        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)

        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """
        Args:
            x: Tensor of shape [seq_len, batch_size, embedding_dim]
        """
        x = x + self.pe[:x.size(0)]
        return x


class StrokeEncoder(nn.Module):
    """Encodes stroke sequences"""

    def __init__(
        self,
        input_dim: int = 6,  # x, y, pressure, tiltX, tiltY, dt
        d_model: int = 256,
        nhead: int = 8,
        num_layers: int = 6,
        dropout: float = 0.1
    ):
        super().__init__()

        self.d_model = d_model

        # Input projection
        self.input_proj = nn.Linear(input_dim, d_model)

        # Positional encoding
        self.pos_encoder = PositionalEncoding(d_model)

        # Transformer encoder
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=False
        )
        self.transformer_encoder = nn.TransformerEncoder(
            encoder_layer,
            num_layers=num_layers
        )

        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        src: torch.Tensor,
        src_key_padding_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            src: [seq_len, batch_size, input_dim]
            src_key_padding_mask: [batch_size, seq_len]

        Returns:
            [seq_len, batch_size, d_model]
        """
        # Project input
        src = self.input_proj(src) * math.sqrt(self.d_model)

        # Add positional encoding
        src = self.pos_encoder(src)
        src = self.dropout(src)

        # Encode
        memory = self.transformer_encoder(
            src,
            src_key_padding_mask=src_key_padding_mask
        )

        return memory


class ImageEncoder(nn.Module):
    """Encodes reference images using CNN"""

    def __init__(self, d_model: int = 256):
        super().__init__()

        self.d_model = d_model

        # Simple CNN encoder
        self.conv_layers = nn.Sequential(
            nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=3, stride=2, padding=1),

            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),

            nn.Conv2d(128, 256, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(inplace=True),

            nn.Conv2d(256, d_model, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(d_model),
            nn.ReLU(inplace=True),
        )

        # Adaptive pooling to get fixed size output
        self.adaptive_pool = nn.AdaptiveAvgPool2d((8, 8))

    def forward(self, images: torch.Tensor) -> torch.Tensor:
        """
        Args:
            images: [batch_size, 3, H, W]

        Returns:
            [seq_len=64, batch_size, d_model]
        """
        # Encode image
        features = self.conv_layers(images)  # [B, d_model, H', W']

        # Adaptive pooling
        features = self.adaptive_pool(features)  # [B, d_model, 8, 8]

        # Reshape to sequence
        batch_size, d_model, h, w = features.shape
        features = features.view(batch_size, d_model, h * w)  # [B, d_model, 64]
        features = features.permute(2, 0, 1)  # [64, B, d_model]

        return features


class StrokeDecoder(nn.Module):
    """Decodes stroke sequences from encoded features"""

    def __init__(
        self,
        output_dim: int = 6,  # x, y, pressure, tiltX, tiltY, dt
        d_model: int = 256,
        nhead: int = 8,
        num_layers: int = 6,
        dropout: float = 0.1
    ):
        super().__init__()

        self.d_model = d_model

        # Input projection for target strokes
        self.tgt_proj = nn.Linear(output_dim, d_model)

        # Positional encoding
        self.pos_encoder = PositionalEncoding(d_model)

        # Transformer decoder
        decoder_layer = nn.TransformerDecoderLayer(
            d_model=d_model,
            nhead=nhead,
            dim_feedforward=d_model * 4,
            dropout=dropout,
            batch_first=False
        )
        self.transformer_decoder = nn.TransformerDecoder(
            decoder_layer,
            num_layers=num_layers
        )

        # Output projection
        self.output_proj = nn.Linear(d_model, output_dim)

        self.dropout = nn.Dropout(dropout)

    def forward(
        self,
        tgt: torch.Tensor,
        memory: torch.Tensor,
        tgt_mask: Optional[torch.Tensor] = None,
        tgt_key_padding_mask: Optional[torch.Tensor] = None,
        memory_key_padding_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Args:
            tgt: [tgt_seq_len, batch_size, output_dim]
            memory: [src_seq_len, batch_size, d_model]
            tgt_mask: [tgt_seq_len, tgt_seq_len]
            tgt_key_padding_mask: [batch_size, tgt_seq_len]
            memory_key_padding_mask: [batch_size, src_seq_len]

        Returns:
            [tgt_seq_len, batch_size, output_dim]
        """
        # Project target
        tgt = self.tgt_proj(tgt) * math.sqrt(self.d_model)

        # Add positional encoding
        tgt = self.pos_encoder(tgt)
        tgt = self.dropout(tgt)

        # Decode
        output = self.transformer_decoder(
            tgt,
            memory,
            tgt_mask=tgt_mask,
            tgt_key_padding_mask=tgt_key_padding_mask,
            memory_key_padding_mask=memory_key_padding_mask
        )

        # Project to output
        output = self.output_proj(output)

        return output


class DrawingTransformer(nn.Module):
    """
    Complete drawing transformer model
    Generates stroke sequences from reference images
    """

    def __init__(
        self,
        input_dim: int = 6,
        output_dim: int = 6,
        d_model: int = 256,
        nhead: int = 8,
        num_encoder_layers: int = 6,
        num_decoder_layers: int = 6,
        dropout: float = 0.1
    ):
        super().__init__()

        self.d_model = d_model

        # Image encoder
        self.image_encoder = ImageEncoder(d_model=d_model)

        # Stroke decoder
        self.decoder = StrokeDecoder(
            output_dim=output_dim,
            d_model=d_model,
            nhead=nhead,
            num_layers=num_decoder_layers,
            dropout=dropout
        )

    def generate_square_subsequent_mask(self, sz: int) -> torch.Tensor:
        """Generate causal mask for autoregressive generation"""
        mask = torch.triu(torch.ones(sz, sz), diagonal=1)
        mask = mask.masked_fill(mask == 1, float('-inf'))
        return mask

    def forward(
        self,
        images: torch.Tensor,
        tgt_strokes: torch.Tensor,
        tgt_key_padding_mask: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Forward pass for training

        Args:
            images: [batch_size, 3, H, W]
            tgt_strokes: [tgt_seq_len, batch_size, output_dim]
            tgt_key_padding_mask: [batch_size, tgt_seq_len]

        Returns:
            [tgt_seq_len, batch_size, output_dim]
        """
        # Encode image
        image_features = self.image_encoder(images)  # [64, batch, d_model]

        # Generate causal mask for target
        tgt_seq_len = tgt_strokes.size(0)
        device = tgt_strokes.device
        tgt_mask = self.generate_square_subsequent_mask(tgt_seq_len).to(device)

        # Decode strokes
        output = self.decoder(
            tgt=tgt_strokes,
            memory=image_features,
            tgt_mask=tgt_mask,
            tgt_key_padding_mask=tgt_key_padding_mask
        )

        return output

    @torch.no_grad()
    def generate(
        self,
        images: torch.Tensor,
        max_length: int = 500,
        temperature: float = 1.0,
        start_token: Optional[torch.Tensor] = None
    ) -> torch.Tensor:
        """
        Generate stroke sequence autoregressively

        Args:
            images: [batch_size, 3, H, W]
            max_length: Maximum sequence length to generate
            temperature: Sampling temperature
            start_token: [batch_size, output_dim] or None

        Returns:
            [max_length, batch_size, output_dim]
        """
        self.eval()

        batch_size = images.size(0)
        device = images.device

        # Encode image
        image_features = self.image_encoder(images)

        # Initialize with start token or zeros
        if start_token is None:
            current = torch.zeros(1, batch_size, 6, device=device)
        else:
            current = start_token.unsqueeze(0)

        generated = [current]

        for _ in range(max_length - 1):
            # Generate mask
            tgt_mask = self.generate_square_subsequent_mask(current.size(0)).to(device)

            # Decode next point
            output = self.decoder(
                tgt=current,
                memory=image_features,
                tgt_mask=tgt_mask
            )

            # Get last prediction
            next_point = output[-1:, :, :]  # [1, batch, output_dim]

            # Apply temperature
            if temperature != 1.0:
                next_point = next_point / temperature

            # Append to sequence
            current = torch.cat([current, next_point], dim=0)
            generated.append(next_point)

        # Stack all generated points
        generated = torch.cat(generated, dim=0)

        return generated


def count_parameters(model: nn.Module) -> int:
    """Count trainable parameters"""
    return sum(p.numel() for p in model.parameters() if p.requires_grad)


if __name__ == '__main__':
    # Test the model
    model = DrawingTransformer(
        input_dim=6,
        output_dim=6,
        d_model=256,
        nhead=8,
        num_encoder_layers=4,
        num_decoder_layers=4,
        dropout=0.1
    )

    print(f"Model parameters: {count_parameters(model):,}")

    # Test forward pass
    batch_size = 2
    seq_len = 100
    images = torch.randn(batch_size, 3, 224, 224)
    tgt_strokes = torch.randn(seq_len, batch_size, 6)

    output = model(images, tgt_strokes)
    print(f"Output shape: {output.shape}")  # Should be [seq_len, batch_size, 6]

    # Test generation
    generated = model.generate(images, max_length=50)
    print(f"Generated shape: {generated.shape}")  # Should be [50, batch_size, 6]

    print("\nModel test passed!")
