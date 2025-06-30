from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import os

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/transcript/<video_id>')
def get_transcript(video_id):
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id)
        # Format transcript for frontend
        formatted = [{'start': entry['start'], 'text': entry['text']} for entry in transcript]
        return jsonify({'success': True, 'transcript': formatted})
    except (TranscriptsDisabled, NoTranscriptFound):
        return jsonify({'success': False, 'error': 'No transcript available for this video'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print(f"Starting YouTube Note Taker server on port {port}")
    print(f"Transcript API available at http://localhost:{port}/api/transcript/:videoId")
    app.run(host='0.0.0.0', port=port, debug=False) 