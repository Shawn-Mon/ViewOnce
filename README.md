# ViewOnce - Secure File Sharing

A secure file sharing service where files can only be viewed once. After viewing, files are automatically deleted to ensure privacy.

## Features

- **View Once**: Files can only be accessed once
- **Auto Delete**: Files are automatically deleted after viewing
- **Media Protection**: Media files (images, videos, audio) cannot be downloaded
- **Unlimited Size**: No file size restrictions
- **Secure**: Files stored temporarily in system temp directory
- **Hacking Theme**: Matrix rain effect with custom hacked font
- **Responsive**: Works on all devices

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Usage

1. Open the application in your browser
2. Upload any file using the drag-and-drop interface
3. Get a unique link to share
4. Recipient can view the file once
5. File is automatically deleted after viewing

## File Type Restrictions

**Media Files** (View only, no download):
- Images: .jpg, .jpeg, .png, .gif, .bmp, .webp
- Videos: .mp4, .avi, .mov, .wmv, .flv, .webm
- Audio: .mp3, .wav, .ogg, .flac

**Other Files** (View and download):
- Documents, archives, executables, etc.

## Security Features

- Files stored in system temp directory
- Automatic cleanup after viewing
- Page visibility detection for immediate cleanup
- No permanent file storage
- One-time access enforcement

## Deployment

### Heroku
```bash
heroku create
git push heroku main
```

### Railway
```bash
railway login
railway deploy
```

### Vercel
```bash
vercel --prod
```

### Docker
```bash
docker build -t view-once-share .
docker run -p 3000:3000 view-once-share
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## Dependencies

- Express.js - Web framework
- Multer - File upload handling
- UUID - Unique ID generation
- Path - File path handling
- fs-extra - Enhanced file system operations

## License

MIT
