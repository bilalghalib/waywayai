"""
Data Loader for wayway.ai AI Training
Fetches drawing data from Airtable and prepares it for training
"""

import os
import json
import requests
from typing import List, Dict, Any, Optional
import numpy as np
from pyairtable import Api
from PIL import Image
from io import BytesIO
import lzstring

class DrawingDataLoader:
    def __init__(self, api_key: str, base_id: str):
        """
        Initialize data loader with Airtable credentials

        Args:
            api_key: Airtable API key
            base_id: Airtable base ID
        """
        self.api = Api(api_key)
        self.base = self.api.base(base_id)
        self.drawings_table = self.base.table('Drawings')
        self.images_table = self.base.table('Images')

    def fetch_all_drawings(self) -> List[Dict[str, Any]]:
        """Fetch all drawing records from Airtable"""
        print("Fetching drawings from Airtable...")
        records = self.drawings_table.all()
        print(f"Found {len(records)} drawings")
        return records

    def decompress_stroke_data(self, compressed_text: str) -> List[Dict]:
        """
        Decompress LZ-String compressed stroke data

        Args:
            compressed_text: LZ-String compressed JSON

        Returns:
            List of stroke points
        """
        try:
            # Try to decompress (UTF16)
            decompressor = lzstring.LZString()
            decompressed = decompressor.decompressFromUTF16(compressed_text)

            if not decompressed:
                # Try as regular JSON
                return json.loads(compressed_text)

            return json.loads(decompressed)
        except Exception as e:
            print(f"Error decompressing stroke data: {e}")
            return []

    def fetch_stroke_data(self, url: str) -> List[Dict]:
        """
        Fetch and decompress stroke data from URL

        Args:
            url: URL to stroke data file

        Returns:
            List of stroke points
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            compressed_text = response.text
            return self.decompress_stroke_data(compressed_text)
        except Exception as e:
            print(f"Error fetching stroke data from {url}: {e}")
            return []

    def fetch_image(self, url: str) -> Optional[Image.Image]:
        """
        Fetch image from URL

        Args:
            url: URL to image

        Returns:
            PIL Image or None
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            img = Image.open(BytesIO(response.content))
            return img.convert('RGB')
        except Exception as e:
            print(f"Error fetching image from {url}: {e}")
            return None

    def fetch_voice_annotations(self, url: str) -> List[Dict]:
        """
        Fetch voice annotation data from URL

        Args:
            url: URL to voice annotations file

        Returns:
            List of voice annotations
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return json.loads(response.text)
        except Exception as e:
            print(f"Error fetching voice annotations from {url}: {e}")
            return []

    def fetch_stroke_analysis(self, url: str) -> Optional[Dict]:
        """
        Fetch stroke analysis data from URL

        Args:
            url: URL to analysis JSON file

        Returns:
            Analysis dict or None
        """
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return json.loads(response.text)
        except Exception as e:
            print(f"Error fetching stroke analysis from {url}: {e}")
            return None

    def parse_stroke_data(self, raw_data: List[Dict]) -> np.ndarray:
        """
        Parse raw stroke data into numpy array

        Args:
            raw_data: Raw stroke data from Airtable

        Returns:
            Numpy array of shape (num_points, num_features)
            Features: [x, y, pressure, tiltX, tiltY, timestamp_delta]
        """
        if not raw_data:
            return np.array([])

        strokes = []

        for i, item in enumerate(raw_data):
            if isinstance(item, dict):
                # Extract event data
                ev = item.get('ev', {})
                packed = item.get('packedLine', {})

                # Get coordinates
                x = ev.get('x', packed.get('x1', 0))
                y = ev.get('y', packed.get('y1', 0))

                # Get pressure (default 0.5 if not available)
                pressure = ev.get('pressure', 0.5)

                # Get tilt
                tilt_x = ev.get('tiltX', 0)
                tilt_y = ev.get('tiltY', 0)

                # Get timestamp
                timestamp = packed.get('Time', 0)

                # Calculate timestamp delta
                if i == 0:
                    timestamp_delta = 0
                else:
                    prev_timestamp = raw_data[i-1].get('packedLine', {}).get('Time', 0)
                    timestamp_delta = timestamp - prev_timestamp

                strokes.append([x, y, pressure, tilt_x, tilt_y, timestamp_delta])

        return np.array(strokes, dtype=np.float32)

    def load_complete_drawing(self, record: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Load complete drawing data including strokes, image, voice, and analysis

        Args:
            record: Airtable record

        Returns:
            Dictionary with all drawing data or None if incomplete
        """
        fields = record['fields']

        # Get drawing text URL
        drawing_text_urls = fields.get('Drawing_Text', [])
        if not drawing_text_urls:
            print(f"No drawing text for record {record['id']}")
            return None

        drawing_text_url = drawing_text_urls[0].get('url')
        if not drawing_text_url:
            return None

        # Fetch stroke data
        raw_strokes = self.fetch_stroke_data(drawing_text_url)
        if not raw_strokes:
            print(f"Failed to fetch stroke data for record {record['id']}")
            return None

        # Parse strokes
        strokes = self.parse_stroke_data(raw_strokes)
        if len(strokes) == 0:
            print(f"No valid strokes for record {record['id']}")
            return None

        # Get reference image
        image_links = fields.get('Image_Link', [])
        reference_image = None

        if image_links:
            try:
                image_record_id = image_links[0]
                image_record = self.images_table.get(image_record_id)
                image_files = image_record['fields'].get('Image_File', [])
                if image_files:
                    image_url = image_files[0].get('url')
                    reference_image = self.fetch_image(image_url)
            except Exception as e:
                print(f"Error fetching reference image: {e}")

        # Get voice annotations if available
        voice_annotations = []
        voice_urls = fields.get('Voice_Annotations', [])
        if voice_urls:
            voice_url = voice_urls[0].get('url')
            if voice_url:
                voice_annotations = self.fetch_voice_annotations(voice_url)

        # Get stroke analysis if available (from new enhanced interface)
        stroke_analysis = None
        # Try to construct analysis URL from drawing URL
        if '_analysis.json' not in drawing_text_url:
            analysis_url = drawing_text_url.replace('lin.txt', '_analysis.json')
            stroke_analysis = self.fetch_stroke_analysis(analysis_url)

        return {
            'id': record['id'],
            'artist': fields.get('Artist', 'unknown'),
            'strokes': strokes,
            'raw_strokes': raw_strokes,
            'reference_image': reference_image,
            'voice_annotations': voice_annotations,
            'stroke_analysis': stroke_analysis,
            'created_time': record.get('createdTime', '')
        }

    def load_all_training_data(self, max_drawings: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Load all training data

        Args:
            max_drawings: Maximum number of drawings to load (None for all)

        Returns:
            List of complete drawing data dictionaries
        """
        records = self.fetch_all_drawings()

        if max_drawings:
            records = records[:max_drawings]

        training_data = []

        print(f"Loading {len(records)} drawings...")

        for i, record in enumerate(records):
            print(f"Loading drawing {i+1}/{len(records)}...")
            drawing_data = self.load_complete_drawing(record)

            if drawing_data:
                training_data.append(drawing_data)

        print(f"Successfully loaded {len(training_data)} complete drawings")

        return training_data

    def get_dataset_statistics(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate statistics about the dataset

        Args:
            training_data: List of training data

        Returns:
            Dictionary of statistics
        """
        total_drawings = len(training_data)
        total_strokes = sum(len(d['strokes']) for d in training_data)

        with_images = sum(1 for d in training_data if d['reference_image'] is not None)
        with_voice = sum(1 for d in training_data if len(d['voice_annotations']) > 0)
        with_analysis = sum(1 for d in training_data if d['stroke_analysis'] is not None)

        avg_strokes = total_strokes / total_drawings if total_drawings > 0 else 0

        # Calculate average pressure if available
        pressures = []
        for d in training_data:
            pressures.extend(d['strokes'][:, 2])  # Pressure is column 2
        avg_pressure = np.mean(pressures) if pressures else 0

        return {
            'total_drawings': total_drawings,
            'total_strokes': total_strokes,
            'avg_strokes_per_drawing': avg_strokes,
            'drawings_with_reference_images': with_images,
            'drawings_with_voice_annotations': with_voice,
            'drawings_with_stroke_analysis': with_analysis,
            'avg_pressure': float(avg_pressure),
        }


if __name__ == '__main__':
    # Test the loader
    import os
    from dotenv import load_dotenv

    load_dotenv()

    api_key = os.getenv('AIRTABLE_API_KEY', 'keynkqQ5trU9JC8lS')
    base_id = os.getenv('AIRTABLE_BASE_ID', 'appXg4bgEEjffU0C4')

    loader = DrawingDataLoader(api_key, base_id)

    # Load first 5 drawings as test
    data = loader.load_all_training_data(max_drawings=5)

    # Print statistics
    stats = loader.get_dataset_statistics(data)
    print("\nDataset Statistics:")
    for key, value in stats.items():
        print(f"  {key}: {value}")

    # Print first drawing info
    if data:
        print(f"\nFirst drawing:")
        print(f"  ID: {data[0]['id']}")
        print(f"  Artist: {data[0]['artist']}")
        print(f"  Strokes shape: {data[0]['strokes'].shape}")
        print(f"  Has reference image: {data[0]['reference_image'] is not None}")
        print(f"  Voice annotations: {len(data[0]['voice_annotations'])}")
