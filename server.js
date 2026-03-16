const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = os.tmpdir();
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = uuidv4() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage
});

// In-memory storage for file metadata
const fileStore = new Map();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Serve temp files
app.use('/temp', express.static(os.tmpdir()));

// Helper function to check if file is media (should block download)
function isMediaFile(filename) {
  const mediaExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mp3', '.wav', '.ogg', '.flac'];
  const ext = path.extname(filename).toLowerCase();
  return mediaExtensions.includes(ext);
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileId = uuidv4();
  const fileData = {
    id: fileId,
    originalName: req.file.originalname,
    filename: req.file.filename,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    uploadedAt: new Date(),
    viewed: false
  };

  fileStore.set(fileId, fileData);

  const fileUrl = `${req.protocol}://${req.get('host')}/view/${fileId}`;
  res.json({ 
    success: true, 
    fileId: fileId,
    url: fileUrl 
  });
});

app.get('/view/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileData = fileStore.get(fileId);

  if (!fileData) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  if (fileData.viewed) {
    // Delete: file and remove from store
    fs.remove(fileData.path).catch(console.error);
    fileStore.delete(fileId);
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // Mark as viewed immediately (first time access)
  fileData.viewed = true;

  // Check if file exists
  if (!fs.existsSync(fileData.path)) {
    fileStore.delete(fileId);
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  const isMedia = isMediaFile(fileData.originalName);
  
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ViewOnce - ${fileData.originalName}</title>
        <style>
            body {
                font-family: 'hacked-font', 'Fira Code', 'Consolas', monospace;
                background: #000;
                min-height: 100vh;
                display: flex;
                align-items: flex-start;
                justify-content: center;
                padding: 20px;
                position: relative;
                overflow-y: auto;
                margin: 0;
            }
            /* Custom font import */
            @font-face {
                font-family: 'hacked-font';
                src: url('C:/Users/HP/Downloads/Compressed/hacked-font/Hacked-KerX.ttf') format('truetype');
            }
            .container {
                background: rgba(0, 0, 0, 0.1);
                border: 2px solid #ff3333;
                border-radius: 5px;
                padding: 40px;
                box-shadow: 
                    0 0 30px rgba(255, 51, 51, 0.4),
                    inset 0 0 30px rgba(255, 51, 51, 0.1),
                    0 0 60px rgba(255, 51, 51, 0.2);
                max-width: 90vw;
                width: 90vw;
                position: relative;
                z-index: 10;
                backdrop-filter: blur(5px);
                margin-top: 20px;
            }
            .header {
                text-align: center;
                margin-bottom: 20px;
                position: relative;
            }
            .logo {
                font-size: 2.5rem;
                margin-bottom: 8px;
                color: #ffffff;
                text-shadow: 
                    0 0 20px #ff3333,
                    0 0 30px #ff3333,
                    0 0 40px #ff3333,
                    0 0 50px #ff3333,
                    0 0 60px #ff3333;
                animation: logo-pulse 2s ease-in-out infinite alternate;
            }
            @keyframes logo-pulse {
                from { 
                    text-shadow: 
                        0 0 20px #ff3333,
                        0 0 30px #ff3333,
                        0 0 40px #ff3333,
                        0 0 50px #ff3333,
                        0 0 60px #ff3333;
                }
                to { 
                    text-shadow: 
                        0 0 25px #ff3333,
                        0 0 35px #ff3333,
                        0 0 45px #ff3333,
                        0 0 55px #ff3333,
                        0 0 65px #ff3333,
                        0 0 75px #ff3333;
                }
            }
            h1 {
                color: #ffffff;
                font-size: 1.5rem;
                margin-bottom: 8px;
                text-shadow: 
                    0 0 15px #ff3333,
                    0 0 25px #ff3333,
                    0 0 35px #ff3333,
                    0 0 45px #ff3333;
                letter-spacing: 2px;
                text-transform: uppercase;
            }
            .warning {
                background: rgba(50, 0, 0, 0.3);
                border: 1px solid #ff0;
                color: #ff0;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                font-size: 0.9rem;
                text-align: center;
            }
            .file-info {
                background: rgba(0, 0, 0, 0.1);
                border: 1px solid #ff3333;
                border-radius: 5px;
                padding: 20px;
                margin-bottom: 20px;
            }
            .file-name {
                color: #ffffff;
                font-weight: 600;
                margin-bottom: 10px;
                text-shadow: 0 0 10px #ff3333;
            }
            .media-container {
                text-align: center;
                margin: 20px 0;
            }
            img, video, audio {
                max-width: 100%;
                max-height: 40vh;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            video {
                width: 100%;
                height: auto;
                max-height: 40vh;
                object-fit: contain;
            }
            video::-webkit-media-controls-panel {
                display: none !important;
            }
            video::-webkit-media-controls-play-button {
                display: none !important;
            }
            video::-webkit-media-controls-start-playback-button {
                display: none !important;
            }
            video::-webkit-media-controls-enclosure {
                display: none !important;
            }
            video::-webkit-media-controls-timeline {
                display: none !important;
            }
            video::-webkit-media-controls-fullscreen-button {
                display: none !important;
            }
            video::-webkit-media-controls-current-time-display {
                display: none !important;
            }
            video::-webkit-media-controls-time-remaining-display {
                display: none !important;
            }
            video::-webkit-media-controls-mute-button {
                display: none !important;
            }
            video::-webkit-media-controls-toggle-closed-captions-button {
                display: none !important;
            }
            video::-webkit-media-controls-volume-slider {
                display: none !important;
            }
            .no-download {
                color: #ff6666;
                font-style: italic;
                margin-top: 20px;
                text-align: center;
                text-shadow: 0 0 5px #ff3333;
            }
            .download-btn {
                display: inline-block;
                background: transparent;
                color: #ffffff;
                border: 2px solid #ff3333;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                margin-top: 20px;
                transition: all 0.3s;
                font-family: 'hacked-font', 'Fira Code', 'Consolas', monospace;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .download-btn:hover {
                background: #ff3333;
                color: #000;
                box-shadow: 0 0 15px #ff3333;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔒</div>
                <h1>ViewOnce File</h1>
            </div>
            
            <div class="warning">
                ⚠️ This file will be permanently deleted when you close this page. It cannot be accessed again by anyone.
                <br><small>💡 Double-click images/videos to enter fullscreen</small>
            </div>
            
            <div class="file-info">
                <div class="file-name">${fileData.originalName}</div>
                <div>Size: ${(fileData.size / 1024 / 1024).toFixed(2)} MB</div>
                <div>Type: ${fileData.mimetype}</div>
            </div>
            
            <div class="media-container">
                ${isMedia ? getMediaPreview(fileData) : '<p>File preview not available for this type.</p>'}
            </div>
            
            ${isMedia ? 
                '<div class="no-download">🚫 Download is disabled for media files to protect privacy</div>' : 
                `<a href="/download/${fileId}" class="download-btn">📥 Download File</a>`
            }
        </div>
        
        <script>
            // Prevent screenshots and print screen
            document.addEventListener('keydown', function(e) {
                // Prevent print screen
                if (e.key === 'PrintScreen' || e.keyCode === 44) {
                    e.preventDefault();
                    return false;
                }
                // Prevent F12 (developer tools)
                if (e.key === 'F12' || e.keyCode === 123) {
                    e.preventDefault();
                    return false;
                }
                // Prevent Ctrl+Shift+I (developer tools)
                if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                    e.preventDefault();
                    return false;
                }
                // Prevent Ctrl+Shift+C (inspect element)
                if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                    e.preventDefault();
                    return false;
                }
            });
            
            // Clear clipboard on paste
            document.addEventListener('paste', function(e) {
                e.preventDefault();
                return false;
            });
            
            // Prevent right-click context menu
            document.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                return false;
            });
            
            // Prevent text selection
            document.addEventListener('selectstart', function(e) {
                e.preventDefault();
                return false;
            });
            
            // Prevent drag
            document.addEventListener('dragstart', function(e) {
                e.preventDefault();
                return false;
            });
            
            // Clear console
            console.clear();
            
            // Override console.log
            console.log = function() {};
            console.error = function() {};
            console.warn = function() {};
            console.info = function() {};
            
            // Hide page from print
            window.addEventListener('beforeprint', function() {
                document.body.style.display = 'none';
            });
            
            // Show page after print dialog closes
            window.addEventListener('afterprint', function() {
                document.body.style.display = 'flex';
            });
            
            // Prevent print with CSS
            const style = document.createElement('style');
            style.textContent = '@media print { body { display: none !important; } * { display: none !important; } }';
            document.head.appendChild(style);
            
            // Auto-cleanup when first viewer closes tab
            window.addEventListener('beforeunload', function() {
                fetch('/cleanup/${fileId}', { method: 'POST' });
            });
            
            // Auto-cleanup when page becomes hidden (tab switch)
            document.addEventListener('visibilitychange', function() {
                if (document.visibilityState === 'hidden') {
                    fetch('/cleanup/${fileId}', { method: 'POST' });
                }
            });
        </script>
    </body>
    </html>
  `);
});

function getMediaPreview(fileData) {
  const mimeType = fileData.mimetype;
  const fileUrl = `/temp/${fileData.filename}`;
  
  if (mimeType.startsWith('image/')) {
    return `<img src="${fileUrl}" alt="${fileData.originalName}" oncontextmenu="return false;" ondblclick="this.requestFullscreen()">`;
  } else if (mimeType.startsWith('video/')) {
    return `<video controls controlsList="nodownload" oncontextmenu="return false;" ondblclick="this.requestFullscreen()" onloadedmetadata="this.currentTime=0;"><source src="${fileUrl}" type="${mimeType}"></video>`;
  } else if (mimeType.startsWith('audio/')) {
    return `<audio controls><source src="${fileUrl}" type="${mimeType}"></audio>`;
  }
  return '<p>Preview not available for this type.</p>';
}

// ... (rest of the code remains the same)
app.get('/download/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileData = fileStore.get(fileId);

  if (!fileData) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (isMediaFile(fileData.originalName)) {
    return res.status(403).json({ error: 'Download not allowed for media files' });
  }

  res.download(fileData.path, fileData.originalName, (err) => {
    if (!err) {
      // Clean up after download
      fs.remove(fileData.path).catch(console.error);
      fileStore.delete(fileId);
    }
  });
});

// Cleanup route
app.post('/cleanup/:fileId', (req, res) => {
  const fileId = req.params.fileId;
  const fileData = fileStore.get(fileId);
  
  if (fileData) {
    fs.remove(fileData.path).catch(console.error);
    fileStore.delete(fileId);
  }
  
  res.json({ success: true });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
