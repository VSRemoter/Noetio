# YouTube Note Taker

A modern web application for taking notes on YouTube videos with support for video transcripts, markdown formatting, and comprehensive note management.

## Features

### 🎥 YouTube Integration
- Load YouTube videos by URL
- Display video information (title, channel)
- Access video descriptions
- Fetch and display video transcripts with clickable timestamps
- YouTube Data API v3 integration for real video metadata

### 📝 Note Taking
- Rich markdown editor with toolbar
- Support for headers, bold, italic, code blocks, quotes
- Bullet and numbered lists
- Undo/redo functionality
- Fullscreen editor mode
- Real-time markdown preview

### 💾 Note Management
- Save notes with custom titles
- Automatic metadata capture (video URL, title, creation/update dates)
- Sidebar with all saved notes
- Click to load and edit existing notes
- Clear individual notes or all notes

### 📤 Export Options
- Download all notes as Markdown (.md)
- Export to CSV for data analysis
- Comprehensive metadata included in exports

### 🎨 Modern UI
- Responsive design
- Clean, intuitive interface
- Dark/light theme support
- Smooth animations and transitions

## Setup

### Prerequisites
- Node.js (for transcript server)
- Python 3.7+ (for Flask transcript API)
- YouTube Data API v3 key (optional, for enhanced video info)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd youtube-note-taker
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install flask flask-cors youtube-transcript-api
   ```

4. **Set up YouTube API key (optional)**
   - Get a YouTube Data API v3 key from [Google Cloud Console](https://console.cloud.google.com/)
   - Add it to the JavaScript file in the `apiKey` variable

### Running the Application

1. **Start the transcript server (Python)**
   ```bash
   python server.py
   ```
   This starts the Flask server on port 8080 for transcript fetching.

2. **Start the main application**
   ```bash
   npm start
   ```
   Or serve the files using any HTTP server:
   ```bash
   python -m http.server 3000
   ```

3. **Open your browser**
   Navigate to `http://localhost:3000`

## Usage

### Taking Notes
1. Paste a YouTube URL in the input field
2. Click "Load Video" to load the video
3. Enter a note title (optional)
4. Use the toolbar to format your notes with markdown
5. Click "Save Note" to save your work

### Accessing Video Information
- Click "Description" to view the video description
- Click "Transcript" to view the video transcript with clickable timestamps
- Click on any timestamp to seek the video to that point

### Managing Notes
- All saved notes appear in the left sidebar
- Click on any note to load and edit it
- Use the "Download All Notes" button to export your notes
- Use the trash icon to clear all notes

### Exporting Notes
- Click "Download All Notes" in the sidebar
- Choose your preferred format:
  - **Markdown**: Best for editing and version control
  - **CSV**: Data analysis and spreadsheet import

## File Structure

```
youtube-note-taker/
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── script.js           # Main JavaScript application
├── server.py           # Python Flask server for transcripts
├── server.js           # Node.js server (alternative)
├── package.json        # Node.js dependencies
├── README.md           # This file
└── venv/               # Python virtual environment
```

## API Endpoints

### Transcript API (Python Flask)
- `GET /api/transcript/:videoId` - Fetch video transcript

### YouTube Data API
- Uses YouTube Data API v3 for video metadata
- Requires API key for enhanced functionality

## Browser Compatibility

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Acknowledgments

- YouTube Data API v3
- YouTube Transcript API
- Marked.js for markdown parsing 