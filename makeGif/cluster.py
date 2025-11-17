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

# Function to perform clustering on FFT features
def cluster_fft_features(fft_features, n_clusters=5):
    kmeans = KMeans(n_clusters=n_clusters)
    labels = kmeans.fit_predict(fft_features)
    return labels

# Function to find the optimal number of clusters using the Elbow Method
def find_optimal_clusters(features):
    sum_of_squared_distances = []
    K = range(1, min(len(features), 10) + 1)
    for k in K:
        kmeans = KMeans(n_clusters=k)
        kmeans = kmeans.fit(features)
        sum_of_squared_distances.append(kmeans.inertia_)
    
    plt.plot(K, sum_of_squared_distances, 'bx-')
    plt.xlabel('Number of clusters')
    plt.ylabel('Sum of squared distances')
    plt.title('Elbow Method For Optimal Number of Clusters')
    plt.show()

    num_clusters = input("Enter the optimal number of clusters (based on the elbow plot): ")
    num_clusters = int(num_clusters) if num_clusters.isdigit() else 1
    return num_clusters

# Function to visualize the clustered strokes by Fourier features
def visualize_clusters_by_fourier(strokes, labels):
    plt.figure(figsize=(12, 8))
    color_map = plt.cm.get_cmap('viridis', max(labels) + 1)

    for i, stroke in enumerate(strokes):
        x = [point['x'] for point in stroke]
        y = [point['y'] for point in stroke]
        plt.plot(x, y, color=color_map(labels[i]), label=f'Cluster {labels[i]}' if i == 0 else "")

    plt.title('Strokes Colored by Fourier Cluster')
    plt.legend()
    plt.show()

# File path
file_path = 'drawme.txt'

# Read the JSON data from the file
drawing_data_json = read_json_from_file(file_path)

# Parse the drawing data
strokes = parse_drawing_data(drawing_data_json)

# Extract FFT features from strokes
fft_features = extract_fft_features(strokes)

if fft_features.size == 0:
    print("No FFT features to cluster.")
else:
    # Determine the optimal number of clusters using the elbow method
    n_clusters = find_optimal_clusters(fft_features)

    # Perform clustering on FFT features with the chosen number of clusters
    labels = cluster_fft_features(fft_features, n_clusters=n_clusters)

    # Visualize the strokes colored by their Fourier cluster
    visualize_clusters_by_fourier(strokes, labels)
