import json
import numpy as np
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from numpy.fft import fft

# Function to read JSON data from a file
def read_json_from_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()

# Function to parse JSON and extract drawing data
def parse_drawing_data(drawing_data_json):
    data = json.loads(drawing_data_json)
    strokes = []
    current_stroke = []
    for item in data:
        if isinstance(item, dict) and 'ev' in item:
            current_stroke.append(item['ev'])
        elif item == 'up' and current_stroke:
            strokes.append(current_stroke)
            current_stroke = []
    return strokes

# Function to apply FFT on stroke data and extract features
def extract_fft_features(strokes):
    fft_features = []
    for stroke in strokes:
        if len(stroke) > 1:
            complex_signal = np.array([complex(p['x'], p['y']) for p in stroke])
            stroke_fft = fft(complex_signal)
            magnitudes = np.abs(stroke_fft[1:4])  # Skip the zero frequency
            fft_features.append(magnitudes)
    return np.array(fft_features)

# Function to calculate length and direction of a stroke
def calculate_stroke_features(strokes):
    features = []
    for stroke in strokes:
        if len(stroke) > 1:
            start_point = stroke[0]
            end_point = stroke[-1]
            length = np.sqrt((end_point['x'] - start_point['x'])**2 + (end_point['y'] - start_point['y'])**2)
            direction = np.arctan2(end_point['y'] - start_point['y'], end_point['x'] - start_point['x'])
            features.append([length, direction])
    return np.array(features)

# Function to perform clustering
def cluster_features(features, n_clusters=5):
    kmeans = KMeans(n_clusters=n_clusters)
    labels = kmeans.fit_predict(features)
    return labels

# Function to visualize the clustered strokes
def visualize_clusters(strokes, labels, title):
    unique_labels = set(labels)
    plt.figure(figsize=(12, 8))
    
    for label in unique_labels:
        cluster_strokes = [stroke for i, stroke in enumerate(strokes) if labels[i] == label]
        for stroke in cluster_strokes:
            x = [point['x'] for point in stroke]
            y = [point['y'] for point in stroke]
            plt.plot(x, y, marker='o', linestyle='-', markersize=2, label=f'Cluster {label}' if label == 0 else "")

    plt.title(title)
    plt.legend()
    plt.show()

# Main function to run the program
def main():
    file_path = 'drawme.txt'
    drawing_data_json = read_json_from_file(file_path)
    strokes = parse_drawing_data(drawing_data_json)

    # User choice for clustering method
    choice = input("Choose clustering method (1 for Fourier, 2 for Stroke Similarity): ")
    
    if choice == '1':
        fft_features = extract_fft_features(strokes)
        if fft_features.size == 0:
            print("No FFT features to cluster.")
            return
        labels = cluster_features(fft_features, n_clusters=5)
        visualize_clusters(strokes, labels, 'Strokes Colored by Fourier Cluster')
    elif choice == '2':
        stroke_features = calculate_stroke_features(strokes)
        if len(stroke_features) == 0:
            print("No stroke features to cluster.")
            return
        labels = cluster_features(stroke_features, n_clusters=5)
        visualize_clusters(strokes, labels, 'Strokes Colored by Stroke Similarity Cluster')
    else:
        print("Invalid choice. Please select 1 or 2.")

if __name__ == "__main__":
    main()
