const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

function saveData() {
    return new Promise((resolve, reject) => {
        const finalizeSave = () => {
            finalizeSaveData()
                .then(({ sessionDir, timestamp }) => {
                    console.log("Callback: finalizeSaveData complete.");
                    resolve({ sessionDir, timestamp });
                })
                .catch(error => {
                    console.error("Error in finalizeSaveData:", error);
                    reject(error);
                });
        };

        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.onstop = finalizeSave;
            mediaRecorder.stop();
        } else {
            finalizeSave();
        }
    });
}

function finalizeSaveData() {
    return new Promise((resolve, reject) => {
        try {
            removeImage();
            const canvasDataUrl = canvas.toDataURL('image/png');
            if (!canvasDataUrl) {
                throw new Error("Failed to generate data URL from canvas");
            }

            const metadata = {
                username: window.username,
                photoURL: document.getElementById('photoURL').value,
                userRecordId: getQueryParameter('User_RecordId'),
                imageRecordId: getQueryParameter('Image_RecordId'),
                browser: navigator.userAgent,
                ip: 'N/A',
                startTime: new Date(startOffset).toISOString(),
                endTime: new Date().toISOString()
            };

            const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
            const pointsBlob = new Blob([JSON.stringify(points)], { type: 'application/json' });
            const imageBlob = dataUrlToBlob(canvasDataUrl);

            uploadInChunks(imageBlob, metadataBlob, pointsBlob)
                .then(({ sessionDir, timestamp }) => resolve({ sessionDir, timestamp }))
                .catch(error => reject(error));
        } catch (error) {
            console.error("Error in finalizeSaveData:", error);
            reject(error);
        }
    });
}

function uploadInChunks(imageBlob, metadataBlob, pointsBlob) {
    return new Promise((resolve, reject) => {
        const totalChunks = Math.ceil(imageBlob.size / CHUNK_SIZE);
        let currentChunk = 0;
        let sessionDir, timestamp;

        function uploadNextChunk() {
            const start = currentChunk * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, imageBlob.size);
            const chunk = imageBlob.slice(start, end);

            const formData = new FormData();
            formData.append('chunk', chunk);
            formData.append('chunkIndex', currentChunk);
            formData.append('totalChunks', totalChunks);

            if (currentChunk === 0) {
                formData.append('metadata', metadataBlob);
                formData.append('pendata', pointsBlob);
            }

            if (audioChunks.length > 0 && currentChunk === totalChunks - 1) {
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp4' });
                formData.append('audio', audioBlob);
            }

            uploadChunk(formData)
                .then(response => {
                    updateProgress((currentChunk + 1) / totalChunks * 100);
                    if (response.sessionDir && response.timestamp) {
                        sessionDir = response.sessionDir;
                        timestamp = response.timestamp;
                    }
                    currentChunk++;
                    if (currentChunk < totalChunks) {
                        uploadNextChunk();
                    } else {
                        resolve({ sessionDir, timestamp });
                    }
                })
                .catch(error => reject(error));
        }

        uploadNextChunk();
    });
}

function uploadChunk(formData) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'uploadmay.php', true);
        
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        resolve(response);
                    } else {
                        reject(new Error(response.error || "Upload failed"));
                    }
                } catch (error) {
                    reject(new Error("Error parsing response JSON"));
                }
            } else {
                reject(new Error(`Upload failed: Server responded with status ${xhr.status}`));
            }
        };
        
        xhr.onerror = function() {
            reject(new Error("Upload failed: A network error occurred."));
        };
        
        xhr.send(formData);
    });
}

function updateProgress(percent) {
    const progressBar = document.getElementById('progress1');
    const progressText = document.getElementById('progress-text1');
    progressBar.value = percent;
    progressText.textContent = `${Math.round(percent)}%`;
}

function dataUrlToBlob(dataUrl) {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Usage
document.getElementById('saveButton').addEventListener('click', () => {
    saveData()
        .then(({ sessionDir, timestamp }) => {
            const redirectUrl = `player.html?sessionDir=${encodeURIComponent(sessionDir)}&timestamp=${timestamp}`;
            window.location.href = redirectUrl;
        })
        .catch(error => {
            console.error("Failed to save data:", error);
            alert(`Failed to save data: ${error.message}. Please try again.`);
        });
});
