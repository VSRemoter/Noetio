const express = require('express');
const cors = require('cors');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Proxy endpoint for YouTube transcripts
app.get('/api/transcript/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        
        // Method 1: Try YouTube's direct timedtext API
        try {
            const transcript = await fetchYouTubeTranscript(videoId);
            if (transcript && transcript.length > 0) {
                return res.json({ success: true, transcript: transcript });
            }
        } catch (error) {
            console.log('Method 1 failed, trying method 2...');
        }
        
        // Method 2: Try to extract from video page
        try {
            const transcript = await fetchTranscriptFromPage(videoId);
            if (transcript && transcript.length > 0) {
                return res.json({ success: true, transcript: transcript });
            }
        } catch (error) {
            console.log('Method 2 failed, trying method 3...');
        }
        
        // Method 3: Try different language codes
        const languageCodes = ['en', 'en-US', 'en-GB', 'a.en'];
        for (const lang of languageCodes) {
            try {
                const transcript = await fetchTranscriptByLanguage(videoId, lang);
                if (transcript && transcript.length > 0) {
                    return res.json({ success: true, transcript: transcript });
                }
            } catch (error) {
                console.log(`Method 3 with ${lang} failed`);
            }
        }
        
        res.json({ success: false, error: 'No transcript available for this video' });
        
    } catch (error) {
        console.error('Transcript fetch error:', error);
        res.json({ success: false, error: 'Failed to fetch transcript' });
    }
});

async function fetchYouTubeTranscript(videoId) {
    // Try YouTube's direct API
    const response = await axios.get(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&fmt=srv3`, {
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    
    if (response.status !== 200) {
        throw new Error('Failed to fetch from YouTube API');
    }
    
    return parseTranscriptXML(response.data);
}

async function fetchTranscriptFromPage(videoId) {
    // Get the video page and extract caption tracks
    const response = await axios.get(`https://www.youtube.com/watch?v=${videoId}`, {
        timeout: 15000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    
    const html = response.data;
    
    // Extract caption tracks
    const captionTracksMatch = html.match(/"captionTracks":\[(.*?)\]/);
    if (!captionTracksMatch) {
        throw new Error('No caption tracks found');
    }
    
    let captionTracks;
    try {
        captionTracks = JSON.parse(`[${captionTracksMatch[1]}]`);
    } catch (e) {
        throw new Error('Failed to parse caption tracks');
    }
    
    // Find English captions or use the first available
    let targetTrack = captionTracks.find(track => 
        track.languageCode === 'en' || 
        track.languageCode === 'en-US' ||
        track.languageCode === 'en-GB'
    ) || captionTracks[0];
    
    if (!targetTrack || !targetTrack.baseUrl) {
        throw new Error('No suitable caption track found');
    }
    
    // Fetch the transcript
    const transcriptResponse = await axios.get(targetTrack.baseUrl, {
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    
    return parseTranscriptXML(transcriptResponse.data);
}

async function fetchTranscriptByLanguage(videoId, languageCode) {
    const response = await axios.get(`https://www.youtube.com/api/timedtext?v=${videoId}&lang=${languageCode}&fmt=srv3`, {
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    });
    
    if (response.status !== 200) {
        throw new Error(`Failed to fetch ${languageCode} transcript`);
    }
    
    return parseTranscriptXML(response.data);
}

async function parseTranscriptXML(xmlText) {
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(xmlText);
    
    const transcript = [];
    
    if (result.transcript && result.transcript.text) {
        result.transcript.text.forEach(textElement => {
            const start = parseFloat(textElement.$.start);
            const text = textElement._ || textElement.$.text || '';
            
            if (text && !isNaN(start)) {
                transcript.push({
                    start: start,
                    text: text.trim()
                });
            }
        });
    }
    
    return transcript;
}

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Transcript API available at http://localhost:${PORT}/api/transcript/:videoId`);
}); 