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

const upload = multer({ storage: storage });

// In-memory storage for file metadata
const fileStore = new Map();

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Serve temp files
app.use('/temp', express.static(os.tmpdir()));

// Helper: check if file is media (block download)
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
    viewed: false,       // NOT viewed yet
    firstOpenedBy: null  // Track who first opened it
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

  // File not found in store at all
  if (!fileData) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // File was already viewed (first viewer closed tab) → show 404
  if (fileData.viewed === true) {
    fs.remove(fileData.path).catch(console.error);
    fileStore.delete(fileId);
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // File physically missing
  if (!fs.existsSync(fileData.path)) {
    fileStore.delete(fileId);
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // ✅ File is valid — serve it. Do NOT mark as viewed here.
  const isMedia = isMediaFile(fileData.originalName);

  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ViewOnce - ${fileData.originalName}</title>
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Fira Code', 'Consolas', monospace;
            background: #000;
            min-height: 100vh;
            display: flex;
            align-items: flex-start;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
            margin: 0;
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
            max-width: 900px;
            width: 100%;
            position: relative;
            z-index: 10;
            backdrop-filter: blur(5px);
            margin-top: 20px;
            margin-bottom: 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            font-size: 2.5rem;
            margin-bottom: 8px;
            animation: logo-pulse 2s ease-in-out infinite alternate;
        }
        @keyframes logo-pulse {
            from { text-shadow: 0 0 20px #ff3333, 0 0 40px #ff3333; }
            to   { text-shadow: 0 0 30px #ff3333, 0 0 60px #ff3333, 0 0 80px #ff3333; }
        }
        h1 {
            color: #ffffff;
            font-size: 1.5rem;
            margin-bottom: 8px;
            text-shadow: 0 0 15px #ff3333, 0 0 30px #ff3333;
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
            color: #ccc;
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
            width: 100%;
        }
        img {
            max-width: 100%;
            max-height: 70vh;
            border-radius: 8px;
            display: block;
            margin: 0 auto;
        }
        video {
            width: 100%;
            max-height: 60vh;
            border-radius: 8px;
            display: block;
            object-fit: contain;
            background: #000;
        }
        audio {
            width: 100%;
            margin-top: 10px;
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
            font-family: 'Fira Code', monospace;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .download-btn:hover {
            background: #ff3333;
            color: #000;
            box-shadow: 0 0 15px #ff3333;
        }
        @media print {
            body, * { display: none !important; }
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
            ${isMedia ? '<br><small>💡 Double-click images/videos to enter fullscreen</small>' : ''}
        </div>

        <div class="file-info">
            <div class="file-name">${fileData.originalName}</div>
            <div>Size: ${(fileData.size / 1024 / 1024).toFixed(2)} MB</div>
            <div>Type: ${fileData.mimetype}</div>
        </div>

        <div class="media-container">
            ${getMediaPreview(fileData)}
        </div>

        ${isMedia
          ? '<div class="no-download">🚫 Download is disabled for media files to protect privacy</div>'
          : `<a href="/download/${fileId}" class="download-btn">📥 Download File</a>`
        }
    </div>

    <script>
        // ── Screenshot / DevTools protection ──────────────────────────────
        document.addEventListener('keydown', function(e) {
            // Block PrintScreen
            if (e.key === 'PrintScreen' || e.keyCode === 44) {
                e.preventDefault();
                // Briefly black out the screen so screenshot captures nothing
                document.body.style.filter = 'brightness(0)';
                setTimeout(() => { document.body.style.filter = ''; }, 500);
                return false;
            }
            // Block F12
            if (e.key === 'F12' || e.keyCode === 123) {
                e.preventDefault(); return false;
            }
            // Block Ctrl+Shift+I / Ctrl+Shift+C / Ctrl+U
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'C')) {
                e.preventDefault(); return false;
            }
            if (e.ctrlKey && e.key === 'u') {
                e.preventDefault(); return false;
            }
            // Block Ctrl+P (print)
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault(); return false;
            }
        });

        document.addEventListener('contextmenu',  e => e.preventDefault());
        document.addEventListener('selectstart',  e => e.preventDefault());
        document.addEventListener('dragstart',    e => e.preventDefault());
        document.addEventListener('paste',        e => e.preventDefault());

        window.addEventListener('beforeprint', () => { document.body.style.display = 'none'; });
        window.addEventListener('afterprint',  () => { document.body.style.display = ''; });

        // Silence console
        console.log = console.error = console.warn = console.info = () => {};

        // ── View-once cleanup: fires ONLY when the first viewer leaves ────
        // This is a best-effort call — browsers don't guarantee fetch in unload.
        // We use sendBeacon (more reliable) with a fetch fallback.
        function markAndCleanup() {
            const url1 = '/mark-viewed/${fileId}';
            const url2 = '/cleanup/${fileId}';
            if (navigator.sendBeacon) {
                navigator.sendBeacon(url1);
                navigator.sendBeacon(url2);
            } else {
                fetch(url1, { method: 'POST', keepalive: true });
                fetch(url2, { method: 'POST', keepalive: true });
            }
        }

        // Tab/window close
        window.addEventListener('beforeunload', markAndCleanup);

        // Tab hidden (switch tab, minimize) — also triggers cleanup
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                markAndCleanup();
            }
        });
    </script>
</body>
</html>`);
});

// ── Media preview helper ────────────────────────────────────────────────────
function getMediaPreview(fileData) {
  const mimeType = fileData.mimetype;
  const fileUrl = `/temp/${fileData.filename}`;

  if (mimeType.startsWith('image/')) {
    return `<img src="${fileUrl}" alt="${fileData.originalName}"
                 oncontextmenu="return false;"
                 ondblclick="this.requestFullscreen()">`;
  }

  if (mimeType.startsWith('video/')) {
    // controls + controlsList="nodownload" → shows timeline/play but no download button
    return `<video controls controlsList="nodownload nofullscreen noremoteplayback"
                   oncontextmenu="return false;"
                   ondblclick="this.requestFullscreen()"
                   onloadedmetadata="this.currentTime=0;">
              <source src="${fileUrl}" type="${mimeType}">
            </video>`;
  }

  if (mimeType.startsWith('audio/')) {
    return `<audio controls controlsList="nodownload">
              <source src="${fileUrl}" type="${mimeType}">
            </audio>`;
  }

  return '<p style="color:#aaa;">Preview not available for this file type.</p>';
}

// ── Download (non-media only) ───────────────────────────────────────────────
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
      fs.remove(fileData.path).catch(console.error);
      fileStore.delete(fileId);
    }
  });
});

// ── Mark as viewed (called by first viewer's browser on unload) ─────────────
app.post('/mark-viewed/:fileId', (req, res) => {
  const fileData = fileStore.get(req.params.fileId);
  if (fileData) {
    fileData.viewed = true;
  }
  res.json({ success: true });
});

// ── Cleanup (delete file + remove from store) ──────────────────────────────
app.post('/cleanup/:fileId', (req, res) => {
  const fileData = fileStore.get(req.params.fileId);
  if (fileData) {
    fs.remove(fileData.path).catch(console.error);
    fileStore.delete(req.params.fileId);
  }
  res.json({ success: true });
});

// ── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
