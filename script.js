// YouTube Note Taker Application
// Add marked.js for markdown rendering
const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
(function loadMarked() {
    const script = document.createElement('script');
    script.src = MARKED_CDN;
    document.head.appendChild(script);
})();

class YouTubeNoteTaker {
    constructor() {
        this.notes = JSON.parse(localStorage.getItem('youtubeNotes')) || [];
        this.currentNoteId = null;
        this.undoStack = [];
        this.redoStack = [];
        this.fsUndoStack = [];
        this.fsRedoStack = [];
        this.apiKey = 'AIzaSyBrj1ZEzZoRoyvOEkkUHMt3awRVebVuZ0g'; // Set your YouTube Data API v3 key here if you want full video info
        this.currentVideoId = null;
        this.currentVideoDescription = '';
        this.currentVideoTranscript = '';
        this.isTranscribing = false;
        this.transcriptionInterval = null;
        this.currentTranscriptIndex = 0;
        this.transcriptEntries = [];
        this.masterTitle = localStorage.getItem('masterTitle') || '';
        
        this.initializeElements();
        this.bindEvents();
        this.loadNotes();
        this.loadSharedNotes(); // Check for shared links
    }

    initializeElements() {
        // Main elements
        this.youtubeLinkInput = document.getElementById('youtubeLink');
        this.loadVideoBtn = document.getElementById('loadVideoBtn');
        this.videoPreview = document.getElementById('videoPreview');
        this.videoContainer = document.getElementById('videoContainer');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoChannel = document.getElementById('videoChannel');
        
        // Editor elements
        this.noteEditor = document.getElementById('noteEditor');
        this.saveNoteBtn = document.getElementById('saveNoteBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.fullscreenModal = document.getElementById('fullscreenModal');
        this.fullscreenEditor = document.getElementById('fullscreenEditor');
        this.exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
        
        // Sidebar elements
        this.notesList = document.getElementById('notesList');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        
        // Toolbar buttons
        this.toolbarButtons = {
            bold: document.getElementById('boldBtn'),
            italic: document.getElementById('italicBtn'),
            strikethrough: document.getElementById('strikethroughBtn'),
            bulletList: document.getElementById('bulletListBtn'),
            numberList: document.getElementById('numberListBtn'),
            quote: document.getElementById('quoteBtn'),
            code: document.getElementById('codeBtn'),
            link: document.getElementById('linkBtn'),
            trash: document.getElementById('trashBtn'),
            undo: document.getElementById('undoBtn'),
            redo: document.getElementById('redoBtn'),
            fullscreen: document.getElementById('fullscreenBtn'),
            preview: document.getElementById('previewBtn')
        };
        
        // Fullscreen toolbar buttons
        this.fsToolbarButtons = {
            bold: document.getElementById('fsBoldBtn'),
            italic: document.getElementById('fsItalicBtn'),
            strikethrough: document.getElementById('fsStrikethroughBtn'),
            bulletList: document.getElementById('fsBulletListBtn'),
            numberList: document.getElementById('fsNumberListBtn'),
            quote: document.getElementById('fsQuoteBtn'),
            code: document.getElementById('fsCodeBtn'),
            link: document.getElementById('fsLinkBtn'),
            trash: document.getElementById('fsTrashBtn'),
            undo: document.getElementById('fsUndoBtn'),
            redo: document.getElementById('fsRedoBtn'),
            fullscreen: document.getElementById('fsFullscreenBtn'),
            preview: document.getElementById('fsPreviewBtn')
        };

        this.descriptionBtn = document.getElementById('descriptionBtn');
        this.transcriptBtn = document.getElementById('transcriptBtn');
        this.videoExtraInfo = document.getElementById('videoExtraInfo');
        this.closePreviewBtn = document.getElementById('closePreviewBtn');
        this.markdownPreview = document.getElementById('markdownPreview');
        this.noteTitleInput = document.getElementById('noteTitleInput');
        this.manualTimestamp = document.getElementById('manualTimestamp');
        this.syncTimestampBtn = document.getElementById('syncTimestampBtn');
        this.shareBtn = document.getElementById('shareBtn');
        
        // Transcript elements
        this.transcriptSearchInput = document.getElementById('transcriptSearchInput');
        this.transcriptSearchResults = document.getElementById('transcriptSearchResults');
        this.transcriptCreateBtn = document.getElementById('transcriptCreateBtn');
        this.transcriptDownloadBtn = document.getElementById('transcriptDownloadBtn');
        this.transcriptContainer = document.getElementById('transcriptContainer');
        
        // Autotranscribe elements
        this.autotranscribeBtn = document.getElementById('autotranscribeBtn');
        this.fsAutotranscribeBtn = document.getElementById('fsAutotranscribeBtn');
        
        // Fullscreen Save Note button
        this.fsSaveNoteBtn = document.getElementById('fsSaveNoteBtn');
        
        // Master title
        this.masterTitleInput = document.getElementById('masterTitleInput');
        
        // Preview modal
        this.previewModal = document.getElementById('previewModal');
    }

    bindEvents() {
        // YouTube video loading
        this.loadVideoBtn.addEventListener('click', () => this.loadYouTubeVideo());
        this.youtubeLinkInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadYouTubeVideo();
        });

        // Note saving
        this.saveNoteBtn.addEventListener('click', () => this.saveNote());
        if (this.fsSaveNoteBtn) this.fsSaveNoteBtn.addEventListener('click', () => this.saveNote());

        // Fullscreen mode
        this.fullscreenBtn.addEventListener('click', () => this.enterFullscreen());
        this.exitFullscreenBtn.addEventListener('click', () => this.exitFullscreen());

        // Sidebar
        this.clearAllBtn.addEventListener('click', () => this.clearAllNotes());

        // Editor events
        this.noteEditor.addEventListener('input', () => this.handleEditorChange());
        this.fullscreenEditor.addEventListener('input', () => this.handleFullscreenEditorChange());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));

        // Download functionality
        this.bindDownloadEvents();

        // Bind toolbar buttons
        // this.bindToolbarEvents();
        // this.bindFullscreenToolbarEvents();

        if (this.descriptionBtn) this.descriptionBtn.addEventListener('click', () => this.toggleDescription());
        if (this.transcriptBtn) this.transcriptBtn.addEventListener('click', () => this.toggleTranscript());
        if (this.closePreviewBtn) this.closePreviewBtn.addEventListener('click', () => this.hidePreview());
        if (this.syncTimestampBtn) this.syncTimestampBtn.addEventListener('click', () => this.syncTimestamp());
        if (this.shareBtn) this.shareBtn.addEventListener('click', () => this.generateShareLink());
        
        // Transcript features
        if (this.transcriptSearchInput) this.transcriptSearchInput.addEventListener('input', () => this.searchTranscript());
        if (this.transcriptCreateBtn) this.transcriptCreateBtn.addEventListener('click', () => this.createNoteFromSelection());
        if (this.transcriptDownloadBtn) this.transcriptDownloadBtn.addEventListener('click', () => this.downloadTranscript());
        
        // Autotranscribe features
        if (this.autotranscribeBtn) this.autotranscribeBtn.addEventListener('click', () => this.toggleAutotranscribe());
        if (this.fsAutotranscribeBtn) this.fsAutotranscribeBtn.addEventListener('click', () => this.toggleAutotranscribe());
        
        // Master title
        if (this.masterTitleInput) {
            this.masterTitleInput.value = this.masterTitle;
            this.masterTitleInput.addEventListener('input', () => this.saveMasterTitle());
        }
        
        // Preview modal
        if (this.closePreviewBtn) this.closePreviewBtn.addEventListener('click', () => this.hidePreview());
        
        // Bind header dropdown events
        this.bindHeaderDropdownEvents();

        // Toolbar event listeners
        this.toolbarButtons.bold.addEventListener('click', () => this.applyFormat('bold'));
        this.toolbarButtons.italic.addEventListener('click', () => this.applyFormat('italic'));
        this.toolbarButtons.strikethrough.addEventListener('click', () => this.applyFormat('strikethrough'));
        this.toolbarButtons.bulletList.addEventListener('click', () => this.applyFormat('bulletList'));
        this.toolbarButtons.numberList.addEventListener('click', () => this.applyFormat('numberList'));
        this.toolbarButtons.quote.addEventListener('click', () => this.applyFormat('quote'));
        this.toolbarButtons.code.addEventListener('click', () => this.applyFormat('code'));
        this.toolbarButtons.link.addEventListener('click', () => this.applyFormat('link'));
        this.toolbarButtons.trash.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all text in this note? This action cannot be undone.')) {
                this.clearEditorContentOnly();
            }
        });
        this.toolbarButtons.undo.addEventListener('click', () => this.undo());
        this.toolbarButtons.redo.addEventListener('click', () => this.redo());
        this.toolbarButtons.fullscreen.addEventListener('click', () => this.enterFullscreen());
        this.toolbarButtons.preview.addEventListener('click', () => this.togglePreview());

        // Fullscreen toolbar event listeners
        this.fsToolbarButtons.bold.addEventListener('click', () => this.applyFullscreenFormat('bold'));
        this.fsToolbarButtons.italic.addEventListener('click', () => this.applyFullscreenFormat('italic'));
        this.fsToolbarButtons.strikethrough.addEventListener('click', () => this.applyFullscreenFormat('strikethrough'));
        this.fsToolbarButtons.bulletList.addEventListener('click', () => this.applyFullscreenFormat('bulletList'));
        this.fsToolbarButtons.numberList.addEventListener('click', () => this.applyFullscreenFormat('numberList'));
        this.fsToolbarButtons.quote.addEventListener('click', () => this.applyFullscreenFormat('quote'));
        this.fsToolbarButtons.code.addEventListener('click', () => this.applyFullscreenFormat('code'));
        this.fsToolbarButtons.link.addEventListener('click', () => this.applyFullscreenFormat('link'));
        this.fsToolbarButtons.trash.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all text in this note? This action cannot be undone.')) {
                this.clearEditorContentOnly();
            }
        });
        this.fsToolbarButtons.undo.addEventListener('click', () => this.fsUndo());
        this.fsToolbarButtons.redo.addEventListener('click', () => this.fsRedo());
        this.fsToolbarButtons.fullscreen.addEventListener('click', () => this.exitFullscreen());
        this.fsToolbarButtons.preview.addEventListener('click', () => this.togglePreview());
    }

    bindDownloadEvents() {
        const downloadBtn = document.getElementById('downloadBtn');
        const downloadMenu = document.getElementById('downloadMenu');
        const downloadOptions = document.querySelectorAll('.download-option');
        
        // Toggle dropdown on button click
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                downloadMenu.classList.toggle('show');
            });
        }
        
        // Handle download option clicks
        downloadOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const format = option.getAttribute('data-format');
                this.downloadNote(format);
                downloadMenu.classList.remove('show');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!downloadBtn.contains(e.target) && !downloadMenu.contains(e.target)) {
                downloadMenu.classList.remove('show');
            }
        });
    }

    downloadNote(format) {
        if (this.notes.length === 0) {
            this.showMessage('No saved notes to download', 'error');
            return;
        }

        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        const filename = `youtube_notes_${timestamp}`;
        
        switch (format) {
            case 'markdown':
                this.downloadAllNotesMarkdown(filename);
                break;
            case 'copy-markdown':
                this.copyAllNotesMarkdown();
                break;
            case 'csv':
                this.downloadAllNotesCSV(filename);
                break;
        }
    }

    downloadAllNotesMarkdown(filename) {
        const masterTitle = this.masterTitle || 'YouTube Notes Collection';
        let markdown = `# ${masterTitle}\n\n`;
        markdown += `**Exported:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;
        markdown += `**Total Notes:** ${this.notes.length}\n\n`;
        markdown += `---\n\n`;

        this.notes.forEach((note, index) => {
            const noteTitle = note.title || note.videoTitle || 'Untitled Note';
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            const timestamp = note.videoTimestamp ? `**Video Timestamp:** ${note.videoTimestamp}\n\n` : '';
            
            markdown += `## ${index + 1}. ${noteTitle}\n\n`;
            markdown += `**Video:** [${note.videoTitle}](${note.videoUrl || 'N/A'})\n\n`;
            markdown += `**Created:** ${createdDate}\n`;
            markdown += `**Updated:** ${updatedDate}\n\n`;
            markdown += timestamp;
            markdown += `**Content:**\n\n`;
            markdown += note.content + '\n\n';
            markdown += `---\n\n`;
        });
        
        this.downloadFile(markdown, `${filename}.md`, 'text/markdown');
        this.showMessage(`All ${this.notes.length} notes downloaded as Markdown successfully!`, 'success');
    }

    copyAllNotesMarkdown() {
        if (this.notes.length === 0) {
            this.showMessage('No saved notes to copy', 'error');
            return;
        }
        
        const masterTitle = this.masterTitle || 'YouTube Notes Collection';
        let markdown = `# ${masterTitle}\n\n`;
        markdown += `**Total Notes:** ${this.notes.length}\n\n`;
        markdown += `---\n\n`;

        this.notes.forEach((note, index) => {
            const noteTitle = note.title || note.videoTitle || 'Untitled Note';
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            const timestamp = note.videoTimestamp ? `**Video Timestamp:** ${note.videoTimestamp}\n\n` : '';
            
            markdown += `## ${index + 1}. ${noteTitle}\n\n`;
            markdown += `**Video:** [${note.videoTitle}](${note.videoUrl || 'N/A'})\n\n`;
            markdown += `**Created:** ${createdDate}\n`;
            markdown += `**Updated:** ${updatedDate}\n\n`;
            markdown += timestamp;
            markdown += `**Content:**\n\n`;
            markdown += note.content + '\n\n';
            markdown += `---\n\n`;
        });
        
        this.copyToClipboard(markdown);
        alert(`✅ Markdown copied successfully!\n\nAll ${this.notes.length} notes have been copied to your clipboard.\n\nYou can now paste them into any note-taking app.`);
    }

    downloadAllNotesCSV(filename) {
        const csvData = [
            ['Note Number', 'Title', 'Video Title', 'Video URL', 'Video Timestamp', 'Created Date', 'Updated Date', 'Content']
        ];
        
        this.notes.forEach((note, index) => {
            const noteTitle = note.title || note.videoTitle || 'Untitled Note';
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            const content = note.content.replace(/\n/g, ' ').replace(/"/g, '""');
            const timestamp = note.videoTimestamp || '';
            
            csvData.push([
                index + 1,
                noteTitle,
                note.videoTitle,
                note.videoUrl || '',
                timestamp,
                createdDate,
                updatedDate,
                content
            ]);
        });
        
        const csv = csvData.map(row => 
            row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        this.downloadFile(csv, `${filename}.csv`, 'text/csv');
        this.showMessage(`All ${this.notes.length} notes downloaded as CSV successfully!`, 'success');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showMessage(`Downloaded ${filename}`, 'success');
    }

    async loadYouTubeVideo() {
        const url = this.youtubeLinkInput.value.trim();
        if (!url) {
            this.showMessage('Please enter a YouTube URL', 'error');
            return Promise.reject('No URL provided');
        }
        const videoId = this.extractYouTubeVideoId(url);
        if (!videoId) {
            this.showMessage('Invalid YouTube URL', 'error');
            return Promise.reject('Invalid URL');
        }
        this.currentVideoId = videoId;
        // Use YouTube iframe API for seeking
        this.videoContainer.innerHTML = `
            <div id="ytplayer"></div>
        `;
        this.videoPreview.style.display = 'block';
        await this.fetchVideoInfo(videoId);
        this.videoExtraInfo.style.display = 'none';
        this.videoExtraInfo.innerHTML = '';
        this.showMessage('Video loaded successfully!', 'success');
        
        // Load YouTube Iframe API if not already loaded
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.body.appendChild(tag);
        }
        
        // Return a promise that resolves when the player is ready
        return new Promise((resolve) => {
            // Wait for API to be ready
            window.onYouTubeIframeAPIReady = () => {
                this.createPlayer(videoId);
                resolve();
            };
            // If API is already loaded
            if (window.YT && window.YT.Player) {
                this.createPlayer(videoId);
                resolve();
            }
        });
    }

    createPlayer(videoId) {
        if (this.player) {
            this.player.loadVideoById(videoId);
            return;
        }
        this.player = new YT.Player('ytplayer', {
            height: '200',
            width: '100%',
            videoId: videoId,
            events: {
                'onReady': (event) => {},
                'onStateChange': (event) => {}
            }
        });
    }

    extractYouTubeVideoId(url) {
        const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
        const match = url.match(regex);
        return match ? match[1] : null;
    }

    async fetchVideoInfo(videoId) {
        // If API key is set, fetch real info, else use placeholders
        if (this.apiKey) {
            try {
                const resp = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${this.apiKey}`);
                const data = await resp.json();
                if (data.items && data.items.length > 0) {
                    const snippet = data.items[0].snippet;
                    this.videoTitle.textContent = snippet.title;
                    this.videoChannel.textContent = snippet.channelTitle;
                    this.currentVideoDescription = snippet.description;
                } else {
                    this.videoTitle.textContent = 'YouTube Video';
                    this.videoChannel.textContent = 'Channel Name';
                    this.currentVideoDescription = '';
                }
            } catch (e) {
                this.videoTitle.textContent = 'YouTube Video';
                this.videoChannel.textContent = 'Channel Name';
                this.currentVideoDescription = '';
            }
        } else {
            this.videoTitle.textContent = 'YouTube Video';
            this.videoChannel.textContent = 'Channel Name';
            this.currentVideoDescription = '';
        }
    }

    async toggleDescription() {
        if (!this.currentVideoId) return;
        if (this.videoExtraInfo.style.display === 'block' && this.videoExtraInfo.dataset.type === 'description') {
            this.videoExtraInfo.style.display = 'none';
            this.videoExtraInfo.innerHTML = '';
            this.videoExtraInfo.dataset.type = '';
            return;
        }
        // Show description
        if (this.apiKey && !this.currentVideoDescription) {
            await this.fetchVideoInfo(this.currentVideoId);
        }
        this.videoExtraInfo.innerHTML = `<strong>Description:</strong><br>${(this.currentVideoDescription || 'No description available.').replace(/\n/g, '<br>')}`;
        this.videoExtraInfo.style.display = 'block';
        this.videoExtraInfo.dataset.type = 'description';
    }

    async toggleTranscript() {
        if (!this.currentVideoId) return;
        if (this.videoExtraInfo.style.display === 'block' && this.videoExtraInfo.dataset.type === 'transcript') {
            this.videoExtraInfo.style.display = 'none';
            this.videoExtraInfo.innerHTML = '';
            this.videoExtraInfo.dataset.type = '';
            return;
        }
        
        this.videoExtraInfo.innerHTML = 'Loading transcript...';
        this.videoExtraInfo.style.display = 'block';
        this.videoExtraInfo.dataset.type = 'transcript';
        
        try {
            const response = await fetch(`http://localhost:8080/api/transcript/${this.currentVideoId}`);
            if (!response.ok) {
                throw new Error('Failed to fetch transcript');
            }
            const data = await response.json();
            if (data.success && data.transcript && data.transcript.length > 0) {
                this.transcriptEntries = data.transcript;
                
                // Create transcript controls
                const controlsHtml = `
                    <div class="transcript-controls">
                        <div class="transcript-search-container">
                            <input type="text" id="transcriptSearchInput" class="transcript-search-input" placeholder="Search transcript...">
                            <div id="transcriptSearchResults" class="transcript-search-results"></div>
                        </div>
                        <div class="transcript-buttons">
                            <button id="transcriptCreateBtn" class="transcript-btn transcript-btn-success" title="Create note from selected text">
                                <i class="fas fa-plus"></i> Create Note
                            </button>
                            <button id="transcriptDownloadBtn" class="transcript-btn transcript-btn-secondary" title="Download transcript">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </div>
                    </div>
                `;
                
                // Create transcript content
                let transcriptHtml = '<strong>Transcript:</strong><br><br>';
                transcriptHtml += '<div id="transcriptContainer" class="transcript-container">';
                data.transcript.forEach((entry, idx) => {
                    const time = this.formatTime(entry.start);
                    const text = entry.text;
                    transcriptHtml += `<div class="transcript-entry" data-index="${idx}">
                        <span class="transcript-time clickable-time" data-seconds="${Math.floor(entry.start)}">[${time}]</span>
                        <span class="transcript-text" data-text="${text.replace(/"/g, '&quot;')}">${text}</span>
                    </div>`;
                });
                transcriptHtml += '</div>';
                
                this.videoExtraInfo.innerHTML = controlsHtml + transcriptHtml;
                this.currentVideoTranscript = data.transcript;
                
                // Re-initialize transcript elements
                this.transcriptSearchInput = document.getElementById('transcriptSearchInput');
                this.transcriptSearchResults = document.getElementById('transcriptSearchResults');
                this.transcriptCreateBtn = document.getElementById('transcriptCreateBtn');
                this.transcriptDownloadBtn = document.getElementById('transcriptDownloadBtn');
                this.transcriptContainer = document.getElementById('transcriptContainer');
                
                // Add event listeners
                if (this.transcriptSearchInput) this.transcriptSearchInput.addEventListener('input', () => this.searchTranscript());
                if (this.transcriptCreateBtn) this.transcriptCreateBtn.addEventListener('click', () => this.createNoteFromSelection());
                if (this.transcriptDownloadBtn) this.transcriptDownloadBtn.addEventListener('click', () => this.downloadTranscript());
                
                // Set initial state of Create Note button
                if (this.transcriptCreateBtn) {
                    this.transcriptCreateBtn.disabled = true;
                    this.transcriptCreateBtn.style.opacity = '0.5';
                }
                
                // Add click listeners to times
                this.addTranscriptTimeListeners();
                
                // Add text selection listeners
                this.addTranscriptSelectionListeners();
                
            } else {
                this.videoExtraInfo.innerHTML = `Transcript not available: ${data.error || 'Unknown error'}`;
            }
        } catch (error) {
            console.error('Transcript fetch error:', error);
            this.videoExtraInfo.innerHTML = 'Transcript not available for this video. Make sure the server is running on port 8080.';
        }
    }

    addTranscriptTimeListeners() {
        const times = this.videoExtraInfo.querySelectorAll('.clickable-time');
        times.forEach(span => {
            span.style.cursor = 'pointer';
            span.style.textDecoration = 'underline';
            span.addEventListener('click', (e) => {
                const seconds = parseInt(span.getAttribute('data-seconds'), 10);
                if (this.player && typeof this.player.seekTo === 'function') {
                    this.player.seekTo(seconds, true);
                }
            });
        });
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
    }

    togglePreview() {
        const textarea = document.activeElement === this.fullscreenEditor ? this.fullscreenEditor : this.noteEditor;
        const isInPreviewMode = textarea.style.display === 'none';
        
        if (isInPreviewMode) {
            // Switch back to editor mode
            textarea.style.display = '';
            textarea.style.backgroundColor = '';
            textarea.style.color = '';
            textarea.style.fontFamily = '';
            textarea.style.lineHeight = '';
            textarea.style.padding = '';
            textarea.style.border = '';
            
            // Find and remove the preview div by looking for it next to the textarea
            const nextElement = textarea.nextSibling;
            if (nextElement && nextElement.tagName === 'DIV' && nextElement.style.backgroundColor === 'rgb(248, 249, 250)') {
                nextElement.remove();
            }
            
            // Restore original markdown content
            const originalContent = textarea.getAttribute('data-original-content');
            if (originalContent) {
                textarea.value = originalContent;
                textarea.removeAttribute('data-original-content');
            }
            
            // Update button icon
            const previewBtn = document.activeElement === this.fullscreenEditor ? 
                this.fsToolbarButtons.preview : this.toolbarButtons.preview;
            previewBtn.innerHTML = '<i class="fas fa-eye"></i>';
            previewBtn.title = 'Preview All Notes';
            
        } else {
            // Show preview of all saved notes inline
            this.showAllNotesPreviewInline();
        }
    }

    showAllNotesPreviewInline() {
        if (!window.marked) {
            this.showMessage('Markdown preview is loading, please try again in a moment.', 'error');
            return;
        }
        
        const textarea = document.activeElement === this.fullscreenEditor ? this.fullscreenEditor : this.noteEditor;
        
        // Generate markdown for all saved notes
        const masterTitle = this.masterTitle || 'YouTube Notes Collection';
        let markdown = `# ${masterTitle}\n\n`;
        markdown += `**Total Notes:** ${this.notes.length}\n\n`;
        markdown += `---\n\n`;

        this.notes.forEach((note, index) => {
            const noteTitle = note.title || note.videoTitle || 'Untitled Note';
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            const timestamp = note.videoTimestamp ? `**Video Timestamp:** ${note.videoTimestamp}\n\n` : '';
            
            markdown += `## ${index + 1}. ${noteTitle}\n\n`;
            markdown += `**Video:** [${note.videoTitle}](${note.videoUrl || 'N/A'})\n\n`;
            markdown += `**Created:** ${createdDate}\n`;
            markdown += `**Updated:** ${updatedDate}\n\n`;
            markdown += timestamp;
            markdown += `**Content:**\n\n`;
            markdown += note.content + '\n\n';
            markdown += `---\n\n`;
        });
        
        const htmlContent = window.marked.parse(markdown);
        
        // Create a temporary div to hold the HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.cssText = `
            width: 100%;
            height: 100%;
            min-height: 200px;
            background-color: #f8f9fa;
            color: #333;
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow-y: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        
        // Store original content and replace textarea with div
        textarea.setAttribute('data-original-content', textarea.value);
        textarea.style.display = 'none';
        textarea.parentNode.insertBefore(tempDiv, textarea.nextSibling);
        
        // Update button icon
        const previewBtn = document.activeElement === this.fullscreenEditor ? 
            this.fsToolbarButtons.preview : this.toolbarButtons.preview;
        previewBtn.innerHTML = '<i class="fas fa-edit"></i>';
        previewBtn.title = 'Back to Editor';
    }

    hidePreview() {
        this.previewModal.classList.remove('active');
    }

    applyFormat(type) {
        const textarea = this.noteEditor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(end);

        let formattedText = '';
        let newCursorPos = start;

        switch (type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                newCursorPos = start + 2;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                newCursorPos = start + 1;
                break;
            case 'strikethrough':
                formattedText = `~~${selectedText}~~`;
                newCursorPos = start + 2;
                break;
            case 'code':
                formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
                newCursorPos = start + 4;
                break;
            case 'quote':
                formattedText = `> ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'h1':
                formattedText = `# ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'h2':
                formattedText = `## ${selectedText}`;
                newCursorPos = start + 3;
                break;
            case 'h3':
                formattedText = `### ${selectedText}`;
                newCursorPos = start + 4;
                break;
            case 'h4':
                formattedText = `#### ${selectedText}`;
                newCursorPos = start + 5;
                break;
            case 'h5':
                formattedText = `##### ${selectedText}`;
                newCursorPos = start + 6;
                break;
            case 'h6':
                formattedText = `###### ${selectedText}`;
                newCursorPos = start + 7;
                break;
            case 'bulletList':
                console.log('Bullet list - selectedText:', `"${selectedText}"`, 'length:', selectedText.length);
                if (selectedText === '') {
                    formattedText = `* `;
                    newCursorPos = start + 2;
                    console.log('Empty selection - adding:', `"${formattedText}"`);
                } else {
                    formattedText = `* ${selectedText}`;
                    newCursorPos = start + 2;
                    console.log('Text selected - adding:', `"${formattedText}"`);
                }
                break;
            case 'numberList':
                console.log('Number list - selectedText:', `"${selectedText}"`, 'length:', selectedText.length);
                if (selectedText === '') {
                    formattedText = `1. `;
                    newCursorPos = start + 3;
                    console.log('Empty selection - adding:', `"${formattedText}"`);
                } else {
                    formattedText = `1. ${selectedText}`;
                    newCursorPos = start + 3;
                    console.log('Text selected - adding:', `"${formattedText}"`);
                }
                break;
            case 'link':
                formattedText = `[${selectedText}](${selectedText})`;
                newCursorPos = start + selectedText.length + 3;
                break;
        }

        const newText = beforeText + formattedText + afterText;
        textarea.value = newText;
        textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
        textarea.focus();
        
        this.handleEditorChange();
    }

    applyFullscreenFormat(type) {
        const textarea = this.fullscreenEditor;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(end);

        let formattedText = '';
        let newCursorPos = start;

        switch (type) {
            case 'bold':
                formattedText = `**${selectedText}**`;
                newCursorPos = start + 2;
                break;
            case 'italic':
                formattedText = `*${selectedText}*`;
                newCursorPos = start + 1;
                break;
            case 'strikethrough':
                formattedText = `~~${selectedText}~~`;
                newCursorPos = start + 2;
                break;
            case 'code':
                formattedText = `\`\`\`\n${selectedText}\n\`\`\``;
                newCursorPos = start + 4;
                break;
            case 'quote':
                formattedText = `> ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'h1':
                formattedText = `# ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'h2':
                formattedText = `## ${selectedText}`;
                newCursorPos = start + 3;
                break;
            case 'h3':
                formattedText = `### ${selectedText}`;
                newCursorPos = start + 4;
                break;
            case 'h4':
                formattedText = `#### ${selectedText}`;
                newCursorPos = start + 5;
                break;
            case 'h5':
                formattedText = `##### ${selectedText}`;
                newCursorPos = start + 6;
                break;
            case 'h6':
                formattedText = `###### ${selectedText}`;
                newCursorPos = start + 7;
                break;
            case 'bulletList':
                console.log('Bullet list - selectedText:', `"${selectedText}"`, 'length:', selectedText.length);
                if (selectedText === '') {
                    formattedText = `* `;
                    newCursorPos = start + 2;
                    console.log('Empty selection - adding:', `"${formattedText}"`);
                } else {
                    formattedText = `* ${selectedText}`;
                    newCursorPos = start + 2;
                    console.log('Text selected - adding:', `"${formattedText}"`);
                }
                break;
            case 'numberList':
                console.log('Number list - selectedText:', `"${selectedText}"`, 'length:', selectedText.length);
                if (selectedText === '') {
                    formattedText = `1. `;
                    newCursorPos = start + 3;
                    console.log('Empty selection - adding:', `"${formattedText}"`);
                } else {
                    formattedText = `1. ${selectedText}`;
                    newCursorPos = start + 3;
                    console.log('Text selected - adding:', `"${formattedText}"`);
                }
                break;
            case 'link':
                formattedText = `[${selectedText}](${selectedText})`;
                newCursorPos = start + selectedText.length + 3;
                break;
        }

        const newText = beforeText + formattedText + afterText;
        textarea.value = newText;
        textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
        textarea.focus();
        
        this.handleFullscreenEditorChange();
    }

    handleEditorChange() {
        // Save current state for undo
        this.undoStack.push(this.noteEditor.value);
        this.redoStack = []; // Clear redo stack when new change is made
        
        // Limit undo stack size
        if (this.undoStack.length > 50) {
            this.undoStack.shift();
        }
    }

    handleFullscreenEditorChange() {
        // Save current state for undo
        this.fsUndoStack.push(this.fullscreenEditor.value);
        this.fsRedoStack = []; // Clear redo stack when new change is made
        
        // Limit undo stack size
        if (this.fsUndoStack.length > 50) {
            this.fsUndoStack.shift();
        }
    }

    undo() {
        if (this.undoStack.length > 0) {
            const currentText = this.noteEditor.value;
            this.redoStack.push(currentText);
            this.noteEditor.value = this.undoStack.pop();
        }
    }

    redo() {
        if (this.redoStack.length > 0) {
            const currentText = this.noteEditor.value;
            this.undoStack.push(currentText);
            this.noteEditor.value = this.redoStack.pop();
        }
    }

    fsUndo() {
        if (this.fsUndoStack.length > 0) {
            const currentText = this.fullscreenEditor.value;
            this.fsRedoStack.push(currentText);
            this.fullscreenEditor.value = this.fsUndoStack.pop();
        }
    }

    fsRedo() {
        if (this.fsRedoStack.length > 0) {
            const currentText = this.fullscreenEditor.value;
            this.fsUndoStack.push(currentText);
            this.fullscreenEditor.value = this.fsRedoStack.pop();
        }
    }

    handleKeyboardShortcuts(e) {
        // Only handle shortcuts when editor is focused
        if (document.activeElement === this.noteEditor || document.activeElement === this.fullscreenEditor) {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'b':
                        e.preventDefault();
                        if (document.activeElement === this.noteEditor) {
                            this.applyFormat('bold');
                        } else {
                            this.applyFullscreenFormat('bold');
                        }
                        break;
                    case 'i':
                        e.preventDefault();
                        if (document.activeElement === this.noteEditor) {
                            this.applyFormat('italic');
                        } else {
                            this.applyFullscreenFormat('italic');
                        }
                        break;
                    case 's':
                        e.preventDefault();
                        if (document.activeElement === this.noteEditor) {
                            this.applyFormat('strikethrough');
                        } else {
                            this.applyFullscreenFormat('strikethrough');
                        }
                        break;
                    case 'z':
                        e.preventDefault();
                        if (document.activeElement === this.noteEditor) {
                            this.undo();
                        } else {
                            this.fsUndo();
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        if (document.activeElement === this.noteEditor) {
                            this.redo();
                        } else {
                            this.fsRedo();
                        }
                        break;
                }
            }
            
            // Handle Enter key for smart list continuation
            if (e.key === 'Enter') {
                const textarea = document.activeElement;
                const cursorPos = textarea.selectionStart;
                const lineStart = this.getLineStart(textarea, cursorPos);
                const lineText = textarea.value.substring(lineStart, cursorPos);
                
                // Check for bullet list continuation
                if (lineText.match(/^\* $/)) {
                    e.preventDefault();
                    this.insertAtCursor(textarea, '\n* ');
                }
                // Check for numbered list continuation
                else if (lineText.match(/^\d+\. $/)) {
                    e.preventDefault();
                    const currentNumber = parseInt(lineText.match(/^(\d+)\./)[1]);
                    this.insertAtCursor(textarea, `\n${currentNumber + 1}. `);
                }
                // Check for bullet list with content
                else if (lineText.match(/^\* .+/)) {
                    e.preventDefault();
                    this.insertAtCursor(textarea, '\n* ');
                }
                // Check for numbered list with content
                else if (lineText.match(/^\d+\. .+/)) {
                    e.preventDefault();
                    const currentNumber = parseInt(lineText.match(/^(\d+)\./)[1]);
                    this.insertAtCursor(textarea, `\n${currentNumber + 1}. `);
                }
                // Check for empty bullet list item (end list)
                else if (lineText.match(/^\*$/)) {
                    e.preventDefault();
                    this.insertAtCursor(textarea, '\n');
                }
                // Check for empty numbered list item (end list)
                else if (lineText.match(/^\d+\.$/)) {
                    e.preventDefault();
                    this.insertAtCursor(textarea, '\n');
                }
            }
            
            // Handle Backspace key to end lists
            if (e.key === 'Backspace') {
                const textarea = document.activeElement;
                const cursorPos = textarea.selectionStart;
                const lineStart = this.getLineStart(textarea, cursorPos);
                const lineText = textarea.value.substring(lineStart, cursorPos);
                
                // If we're at the beginning of a list item, end the list
                if (lineText.match(/^\* $/) || lineText.match(/^\d+\. $/)) {
                    e.preventDefault();
                    // Remove the list marker and space
                    const beforeText = textarea.value.substring(0, lineStart);
                    const afterText = textarea.value.substring(cursorPos);
                    textarea.value = beforeText + afterText;
                    textarea.setSelectionRange(lineStart, lineStart);
                    textarea.focus();
                    
                    if (textarea === this.noteEditor) {
                        this.handleEditorChange();
                    } else if (textarea === this.fullscreenEditor) {
                        this.handleFullscreenEditorChange();
                    }
                }
            }
        }
    }

    enterFullscreen() {
        // Copy content from main editor to fullscreen editor
        this.fullscreenEditor.value = this.noteEditor.value;
        this.fullscreenModal.style.display = 'block';
        this.fullscreenEditor.focus();
        
        // Copy undo/redo stacks
        this.fsUndoStack = [...this.undoStack];
        this.fsRedoStack = [...this.redoStack];
    }

    exitFullscreen() {
        // Copy content back from fullscreen editor to main editor
        this.noteEditor.value = this.fullscreenEditor.value;
        this.fullscreenModal.style.display = 'none';
        this.noteEditor.focus();
        
        // Copy undo/redo stacks back
        this.undoStack = [...this.fsUndoStack];
        this.redoStack = [...this.fsRedoStack];
    }

    saveNote() {
        const videoUrl = this.youtubeLinkInput.value.trim();
        const noteContent = this.noteEditor.value.trim();
        const noteTitle = this.noteTitleInput.value.trim();
        if (!videoUrl && !noteContent && !noteTitle) {
            this.showMessage('Please enter a YouTube URL, note title, or note content', 'error');
            return;
        }
        
        // Get current video timestamp if video is playing
        let videoTimestamp = null;
        
        // Check if manual timestamp is provided
        const manualTimestamp = this.manualTimestamp.value.trim();
        if (manualTimestamp) {
            // Validate manual timestamp format
            if (this.isValidTimestamp(manualTimestamp)) {
                videoTimestamp = manualTimestamp;
            } else {
                this.showMessage('Invalid timestamp format. Use MM:SS or HH:MM:SS', 'error');
                return;
            }
        } else if (this.player && typeof this.player.getCurrentTime === 'function') {
            // Use current video time if no manual timestamp
            const currentTime = this.player.getCurrentTime();
            if (currentTime && currentTime > 0) {
                videoTimestamp = this.formatTime(currentTime);
            }
        }
        
        const note = {
            id: this.currentNoteId || Date.now().toString(),
            videoUrl: videoUrl,
            videoTitle: this.videoTitle.textContent || 'Untitled Video',
            videoChannel: this.videoChannel.textContent || 'Unknown Channel',
            content: noteContent,
            title: noteTitle,
            videoTimestamp: videoTimestamp, // Add video timestamp
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // Update existing note or add new one
        const existingIndex = this.notes.findIndex(n => n.id === note.id);
        if (existingIndex !== -1) {
            this.notes[existingIndex] = note;
        } else {
            this.notes.unshift(note); // Add to beginning
        }
        this.saveToLocalStorage();
        this.loadNotes();
        
        // Clear only the editor content, keep video visible
        this.clearEditorContentOnly();
        
        // Show success message with timestamp if available
        let successMessage = 'Note saved successfully!';
        if (videoTimestamp) {
            successMessage += ` (Timestamp: ${videoTimestamp})`;
        }
        this.showMessage(successMessage, 'success');
    }

    clearEditorContentOnly() {
        // Clear only the editor content, not the video
        this.currentNoteId = null;
        this.noteEditor.value = '';
        this.noteTitleInput.value = '';
        this.manualTimestamp.value = '';
        this.undoStack = [];
        this.redoStack = [];
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    loadNotes() {
        this.notesList.innerHTML = '';
        if (this.notes.length === 0) {
            this.notesList.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">No saved notes yet</p>';
            return;
        }
        
        // Sort notes by timestamp
        const sortedNotes = this.sortNotesByTimestamp(this.notes);
        
        sortedNotes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            this.notesList.appendChild(noteElement);
        });
    }

    sortNotesByTimestamp(notes) {
        return notes.sort((a, b) => {
            // If both notes have timestamps, compare them
            if (a.videoTimestamp && b.videoTimestamp) {
                const timeA = this.parseTimestampToSeconds(a.videoTimestamp);
                const timeB = this.parseTimestampToSeconds(b.videoTimestamp);
                if (timeA !== null && timeB !== null) {
                    return timeA - timeB; // Sort ascending (lowest time first)
                }
            }
            
            // If only one has timestamp, put the one with timestamp first
            if (a.videoTimestamp && !b.videoTimestamp) return -1;
            if (!a.videoTimestamp && b.videoTimestamp) return 1;
            
            // If neither has timestamp, sort by creation date (newest first)
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }

    createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        noteDiv.dataset.noteId = note.id;
        const title = note.title ? note.title : (note.videoTitle !== 'Untitled Video' ? note.videoTitle : 'Untitled Note');
        const preview = note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');
        
        // Only show timestamp if available
        const timestampDisplay = note.videoTimestamp ? 
            `<div class="note-timestamp">${note.videoTimestamp}</div>` : '';
        
        noteDiv.innerHTML = `
            <div class="note-content">
                <div class="note-title">${title}</div>
                <div class="note-preview">${preview}</div>
                ${timestampDisplay}
            </div>
            <button class="note-delete-btn" title="Delete note">×</button>
        `;
        
        // Add click event for loading note
        noteDiv.querySelector('.note-content').addEventListener('click', () => this.loadNote(note));
        
        // Add click event for delete button
        noteDiv.querySelector('.note-delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteNote(note.id);
        });
        
        return noteDiv;
    }

    loadNote(note) {
        this.currentNoteId = note.id;
        this.noteEditor.value = note.content || '';
        this.noteTitleInput.value = note.title || '';
        
        // Update video URL without reloading if it's the same video
        const currentVideoId = this.extractYouTubeVideoId(this.youtubeLinkInput.value);
        const newVideoId = this.extractYouTubeVideoId(note.videoUrl || '');
        
        if (note.videoUrl) {
            this.youtubeLinkInput.value = note.videoUrl;
            
            if (currentVideoId === newVideoId && this.player) {
                // Same video, just seek to timestamp
                if (note.videoTimestamp) {
                    const timestampSeconds = this.parseTimestampToSeconds(note.videoTimestamp);
                    if (timestampSeconds !== null) {
                        this.player.seekTo(timestampSeconds, true);
                    }
                }
            } else {
                // Different video, load new video
                this.loadYouTubeVideo().then(() => {
                    // Seek to timestamp if available
                    if (note.videoTimestamp && this.player && typeof this.player.seekTo === 'function') {
                        const timestampSeconds = this.parseTimestampToSeconds(note.videoTimestamp);
                        if (timestampSeconds !== null) {
                            setTimeout(() => {
                                this.player.seekTo(timestampSeconds, true);
                            }, 1000);
                        }
                    }
                });
            }
        } else {
            this.videoPreview.style.display = 'none';
        }
        
        // Update active state in sidebar
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-note-id="${note.id}"]`).classList.add('active');
        
        // Clear undo/redo stacks
        this.undoStack = [];
        this.redoStack = [];
    }

    parseTimestampToSeconds(timestamp) {
        // Convert timestamp like "3:29" or "1:23:45" to seconds
        const parts = timestamp.split(':').map(Number);
        if (parts.length === 2) {
            // MM:SS format
            return parts[0] * 60 + parts[1];
        } else if (parts.length === 3) {
            // HH:MM:SS format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        return null;
    }

    clearEditor() {
        this.currentNoteId = null;
        this.youtubeLinkInput.value = '';
        this.noteEditor.value = '';
        this.noteTitleInput.value = '';
        this.videoPreview.style.display = 'none';
        this.undoStack = [];
        this.redoStack = [];
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    clearAllNotes() {
        if (confirm('Are you sure you want to delete all notes? This action cannot be undone.')) {
            this.notes = [];
            this.saveToLocalStorage();
            this.loadNotes();
            this.clearEditor();
            this.showMessage('All notes cleared', 'success');
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('youtubeNotes', JSON.stringify(this.notes));
    }

    showMessage(message, type = 'success') {
        // Remove existing messages
        const existingMessages = document.querySelectorAll('.message');
        existingMessages.forEach(msg => msg.remove());
        
        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Insert after header
        const header = document.querySelector('.header');
        header.parentNode.insertBefore(messageDiv, header.nextSibling);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 3000);
    }

    bindToolbarEvents() {
        // Bold
        this.toolbarButtons.bold.addEventListener('click', () => this.applyFormat('bold'));
        
        // Italic
        this.toolbarButtons.italic.addEventListener('click', () => this.applyFormat('italic'));
        
        // Code
        this.toolbarButtons.code.addEventListener('click', () => this.applyFormat('code'));
        
        // Quote
        this.toolbarButtons.quote.addEventListener('click', () => this.applyFormat('quote'));
        
        // Lists
        this.toolbarButtons.bulletList.addEventListener('click', () => this.applyFormat('bulletList'));
        this.toolbarButtons.numberList.addEventListener('click', () => this.applyFormat('numberList'));
        
        // Undo/Redo
        this.toolbarButtons.undo.addEventListener('click', () => this.undo());
        this.toolbarButtons.redo.addEventListener('click', () => this.redo());
        
        // Fullscreen
        this.toolbarButtons.fullscreen.addEventListener('click', () => this.enterFullscreen());
    }

    bindFullscreenToolbarEvents() {
        // Bold
        this.fsToolbarButtons.bold.addEventListener('click', () => this.applyFullscreenFormat('bold'));
        
        // Italic
        this.fsToolbarButtons.italic.addEventListener('click', () => this.applyFullscreenFormat('italic'));
        
        // Code
        this.fsToolbarButtons.code.addEventListener('click', () => this.applyFullscreenFormat('code'));
        
        // Quote
        this.fsToolbarButtons.quote.addEventListener('click', () => this.applyFullscreenFormat('quote'));
        
        // Lists
        this.fsToolbarButtons.bulletList.addEventListener('click', () => this.applyFullscreenFormat('bulletList'));
        this.fsToolbarButtons.numberList.addEventListener('click', () => this.applyFullscreenFormat('numberList'));
        
        // Undo/Redo
        this.fsToolbarButtons.undo.addEventListener('click', () => this.fsUndo());
        this.fsToolbarButtons.redo.addEventListener('click', () => this.fsRedo());
        
        // Fullscreen
        this.fsToolbarButtons.fullscreen.addEventListener('click', () => this.exitFullscreen());
    }

    convertMarkdownToHTML(markdown) {
        if (!markdown || markdown.trim() === '') {
            return '<p></p>';
        }

        let html = markdown;
        
        // Process code blocks first (before other formatting)
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        
        // Process inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Process headers (must be at start of line)
        html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
        html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
        html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Process blockquotes (must be at start of line)
        html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
        
        // Process lists (must be at start of line)
        // Handle numbered lists first - preserve the actual numbers
        html = html.replace(/^(\d+)\. (.*$)/gim, '<li class="numbered" style="list-style-type: none;"><span style="font-weight: bold; margin-right: 8px;">$1.</span>$2</li>');
        // Handle bullet lists
        html = html.replace(/^\* (.*$)/gim, '<li class="bullet">$1</li>');
        
        // Process links (avoid processing inside code blocks)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        
        // Process bold and italic (order matters - bold first)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Process strikethrough
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
        
        // Group consecutive list items into proper lists
        html = html.replace(/(<li class="numbered" style="list-style-type: none;"><span style="font-weight: bold; margin-right: 8px;">.*?<\/span><\/li>)+/gs, function(match) {
            return '<ol>' + match + '</ol>';
        });
        
        html = html.replace(/(<li class="bullet">.*?<\/li>)+/gs, function(match) {
            return '<ul>' + match + '</ul>';
        });
        
        // Remove the class and data attributes from list items
        html = html.replace(/class="numbered" style="list-style-type: none;"/g, '');
        html = html.replace(/class="bullet"/g, '');
        
        // Handle line breaks and paragraphs
        // Split by double line breaks to create paragraphs
        const lines = html.split(/\n\n+/);
        const processedLines = lines.map(line => {
            line = line.trim();
            if (line === '') return '';
            
            // If line already starts with a block element, don't wrap in p
            if (line.match(/^<(h[1-6]|blockquote|pre|ul|ol|li)/i)) {
                return line;
            }
            
            // Replace single line breaks with <br> within paragraphs
            line = line.replace(/\n/g, '<br>');
            return '<p>' + line + '</p>';
        });
        
        html = processedLines.filter(line => line !== '').join('\n');
        
        // Clean up any empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        
        return html;
    }

    deleteNote(noteId) {
        if (confirm('Are you sure you want to delete this note? This action cannot be undone.')) {
            this.notes = this.notes.filter(note => note.id !== noteId);
            this.saveToLocalStorage();
            this.loadNotes();
            this.showMessage('Note deleted successfully!', 'success');
        }
    }

    // Bind header dropdown events
    bindHeaderDropdownEvents() {
        const headerOptions = document.querySelectorAll('.header-option');
        headerOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const level = option.getAttribute('data-level');
                this.applyFormat(`h${level}`);
            });
        });
    }

    // Implementation of syncTimestamp method
    syncTimestamp() {
        if (this.player && typeof this.player.getCurrentTime === 'function') {
            const currentTime = this.player.getCurrentTime();
            if (currentTime && currentTime >= 0) {
                const formattedTime = this.formatTime(currentTime);
                this.manualTimestamp.value = formattedTime;
                this.showMessage(`Timestamp synced: ${formattedTime}`, 'success');
            } else {
                this.showMessage('Video not playing or time not available', 'error');
            }
        } else {
            this.showMessage('Video player not available', 'error');
        }
    }

    isValidTimestamp(timestamp) {
        // Accept formats: MM:SS, HH:MM:SS
        const timeRegex = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;
        return timeRegex.test(timestamp);
    }

    getLineStart(textarea, cursorPos) {
        const text = textarea.value;
        let lineStart = cursorPos;
        while (lineStart > 0 && text[lineStart - 1] !== '\n') {
            lineStart--;
        }
        return lineStart;
    }

    insertAtCursor(textarea, textToInsert) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const beforeText = textarea.value.substring(0, start);
        const afterText = textarea.value.substring(end);
        
        textarea.value = beforeText + textToInsert + afterText;
        textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
        textarea.focus();
        
        // Trigger change event
        if (textarea === this.noteEditor) {
            this.handleEditorChange();
        } else if (textarea === this.fullscreenEditor) {
            this.handleFullscreenEditorChange();
        }
    }

    generateShareLink() {
        if (this.notes.length === 0) {
            this.showMessage('No saved notes to share', 'error');
            return;
        }

        // Generate a unique ID for this share
        const shareId = this.generateUniqueId();
        
        // Create share data (no expiration)
        const shareData = {
            id: shareId,
            notes: this.notes,
            createdAt: new Date().toISOString()
        };
        
        // Store in localStorage (in a real app, this would go to a database)
        const shares = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
        shares[shareId] = shareData;
        localStorage.setItem('sharedNotes', JSON.stringify(shares));
        
        // Generate the share URL
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
        
        // Display the link in a modal or popup
        this.showShareLinkModal(shareUrl);
    }

    showShareLinkModal(shareUrl) {
        // Create modal HTML
        const modalHTML = `
            <div id="shareLinkModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(0,0,0,0.7);
                z-index: 2000;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 90vw;
                    padding: 30px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
                ">
                    <h3 style="margin-top: 0; color: #333;">Share Link Generated</h3>
                    <p style="color: #666; margin-bottom: 20px;">Your public link has been created. Click the link below to copy it:</p>
                    <div style="
                        background: #f8f9fa;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        padding: 12px;
                        margin-bottom: 20px;
                        word-break: break-all;
                        font-family: monospace;
                        font-size: 14px;
                        color: #007bff;
                        cursor: pointer;
                    " id="shareLinkDisplay">${shareUrl}</div>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="copyShareLinkBtn" style="
                            background: #007bff;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                            font-weight: 600;
                        ">Copy Link</button>
                        <button id="closeShareModalBtn" style="
                            background: #6c757d;
                            color: white;
                            border: none;
                            padding: 10px 20px;
                            border-radius: 6px;
                            cursor: pointer;
                        ">Close</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        const modal = document.getElementById('shareLinkModal');
        const copyBtn = document.getElementById('copyShareLinkBtn');
        const closeBtn = document.getElementById('closeShareModalBtn');
        const linkDisplay = document.getElementById('shareLinkDisplay');
        
        // Copy link functionality
        copyBtn.addEventListener('click', () => {
            this.copyToClipboard(shareUrl);
            this.showMessage('Public Link Copied', 'success');
        });
        
        // Close modal
        closeBtn.addEventListener('click', () => {
            modal.remove();
        });
        
        // Click on link display to copy
        linkDisplay.addEventListener('click', () => {
            this.copyToClipboard(shareUrl);
            this.showMessage('Public Link Copied', 'success');
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    generateUniqueId() {
        return 'share_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    copyToClipboard(text) {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text);
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            textArea.remove();
        }
    }

    loadSharedNotes() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        
        if (shareId) {
            const shares = JSON.parse(localStorage.getItem('sharedNotes') || '{}');
            const shareData = shares[shareId];
            
            if (shareData) {
                // Load the shared notes in view-only mode
                this.loadSharedNotesView(shareData.notes);
                this.showMessage('Shared notes loaded in view-only mode', 'success');
            } else {
                this.showMessage('Share link not found or invalid', 'error');
            }
        }
    }

    loadSharedNotesView(sharedNotes) {
        // Disable editing functionality
        this.noteEditor.readOnly = true;
        this.fullscreenEditor.readOnly = true;
        this.saveNoteBtn.disabled = true;
        this.shareBtn.disabled = true;
        this.clearAllBtn.disabled = true;
        
        // Hide editor controls
        document.querySelector('.editor-controls').style.display = 'none';
        document.querySelector('.toolbar').style.display = 'none';
        
        // Load the shared notes
        this.notes = sharedNotes;
        this.loadNotes();
        
        // Add a banner indicating this is a shared view
        const banner = document.createElement('div');
        banner.className = 'shared-banner';
        banner.innerHTML = '<i class="fas fa-eye"></i> Viewing shared notes (read-only)';
        banner.style.cssText = `
            background-color: #17a2b8;
            color: white;
            padding: 10px;
            text-align: center;
            font-weight: bold;
            margin-bottom: 15px;
            border-radius: 4px;
        `;
        
        const mainContent = document.querySelector('.main-content');
        mainContent.insertBefore(banner, mainContent.firstChild);
    }

    // Transcript search functionality
    searchTranscript() {
        const searchTerm = this.transcriptSearchInput.value.toLowerCase().trim();
        const resultsContainer = this.transcriptSearchResults;
        
        if (!searchTerm) {
            resultsContainer.classList.remove('show');
            this.clearTranscriptHighlights();
            return;
        }
        
        const results = [];
        this.transcriptEntries.forEach((entry, index) => {
            if (entry.text.toLowerCase().includes(searchTerm)) {
                results.push({
                    index: index,
                    text: entry.text,
                    time: this.formatTime(entry.start)
                });
            }
        });
        
        if (results.length > 0) {
            resultsContainer.innerHTML = '';
            results.forEach(result => {
                const resultElement = document.createElement('div');
                resultElement.className = 'transcript-search-result';
                resultElement.innerHTML = `<strong>[${result.time}]</strong> ${result.text}`;
                resultElement.addEventListener('click', () => {
                    this.scrollToTranscriptEntry(result.index);
                    this.highlightTranscriptEntry(result.index);
                });
                resultsContainer.appendChild(resultElement);
            });
            resultsContainer.classList.add('show');
            this.highlightSearchTerms(searchTerm);
        } else {
            resultsContainer.innerHTML = '<div class="transcript-search-result">No results found</div>';
            resultsContainer.classList.add('show');
            this.clearTranscriptHighlights();
        }
    }

    scrollToTranscriptEntry(index) {
        const entry = this.transcriptContainer.querySelector(`[data-index="${index}"]`);
        if (entry) {
            entry.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    highlightTranscriptEntry(index) {
        this.clearTranscriptHighlights();
        const entry = this.transcriptContainer.querySelector(`[data-index="${index}"]`);
        if (entry) {
            entry.style.backgroundColor = '#fff3cd';
            entry.style.borderRadius = '4px';
            entry.style.padding = '4px';
        }
    }

    highlightSearchTerms(searchTerm) {
        const textElements = this.transcriptContainer.querySelectorAll('.transcript-text');
        textElements.forEach(element => {
            const text = element.textContent;
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            element.innerHTML = text.replace(regex, '<span class="transcript-text highlighted">$1</span>');
        });
    }

    clearTranscriptHighlights() {
        const textElements = this.transcriptContainer.querySelectorAll('.transcript-text');
        textElements.forEach(element => {
            element.innerHTML = element.textContent;
        });
        
        const entries = this.transcriptContainer.querySelectorAll('.transcript-entry');
        entries.forEach(entry => {
            entry.style.backgroundColor = '';
            entry.style.borderRadius = '';
            entry.style.padding = '';
        });
    }

    addTranscriptSelectionListeners() {
        const textElements = this.transcriptContainer.querySelectorAll('.transcript-text');
        textElements.forEach(element => {
            element.addEventListener('mouseup', () => {
                const selection = window.getSelection();
                if (selection.toString().trim()) {
                    this.transcriptCreateBtn.style.opacity = '1';
                    this.transcriptCreateBtn.disabled = false;
                } else {
                    this.transcriptCreateBtn.style.opacity = '0.5';
                    this.transcriptCreateBtn.disabled = true;
                }
            });
        });
    }

    createNoteFromSelection() {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
            this.showMessage('Please select some text from the transcript first', 'error');
            return;
        }
        
        // Get the current video info
        const videoTitle = this.videoTitle.textContent || 'Unknown Video';
        const videoUrl = this.youtubeLinkInput.value || '';
        const timestamp = this.manualTimestamp.value || '0:00';
        
        // Create a new note
        const note = {
            id: Date.now().toString(),
            title: `Transcript Quote: ${selectedText.substring(0, 50)}${selectedText.length > 50 ? '...' : ''}`,
            content: selectedText,
            videoTitle: videoTitle,
            videoUrl: videoUrl,
            videoTimestamp: timestamp,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.notes.push(note);
        this.saveToLocalStorage();
        this.loadNotes();
        
        this.showMessage('Note created from transcript selection!', 'success');
        
        // Clear selection
        selection.removeAllRanges();
        this.transcriptCreateBtn.style.opacity = '0.5';
        this.transcriptCreateBtn.disabled = true;
    }

    downloadTranscript() {
        if (!this.transcriptEntries || this.transcriptEntries.length === 0) {
            this.showMessage('No transcript available to download', 'error');
            return;
        }
        
        let transcriptText = `Transcript for: ${this.videoTitle.textContent}\n`;
        transcriptText += `Video URL: ${this.youtubeLinkInput.value}\n`;
        transcriptText += `Downloaded: ${new Date().toLocaleString()}\n\n`;
        
        this.transcriptEntries.forEach(entry => {
            const time = this.formatTime(entry.start);
            transcriptText += `[${time}] ${entry.text}\n`;
        });
        
        const filename = `transcript_${this.currentVideoId}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
        this.downloadFile(transcriptText, filename, 'text/plain');
        this.showMessage('Transcript downloaded successfully!', 'success');
    }

    // Autotranscribe functionality
    toggleAutotranscribe() {
        if (!this.currentVideoId || !this.transcriptEntries || this.transcriptEntries.length === 0) {
            this.showMessage('Please load a video with transcript first', 'error');
            return;
        }
        
        if (this.isTranscribing) {
            this.stopAutotranscribe();
        } else {
            this.startAutotranscribe();
        }
    }

    startAutotranscribe() {
        this.isTranscribing = true;
        
        // Get current video time and find the corresponding transcript index
        let currentTime = 0;
        if (this.player && typeof this.player.getCurrentTime === 'function') {
            currentTime = this.player.getCurrentTime();
        }
        
        // Find the transcript entry closest to current time
        this.currentTranscriptIndex = 0;
        for (let i = 0; i < this.transcriptEntries.length; i++) {
            if (this.transcriptEntries[i].start >= currentTime) {
                this.currentTranscriptIndex = i;
                break;
            }
        }
        
        // Update button appearance
        this.autotranscribeBtn.classList.add('transcribing');
        this.autotranscribeBtn.innerHTML = '<i class="fas fa-stop"></i>';
        this.autotranscribeBtn.title = 'Stop Auto-transcribe';
        
        if (this.fsAutotranscribeBtn) {
            this.fsAutotranscribeBtn.classList.add('transcribing');
            this.fsAutotranscribeBtn.innerHTML = '<i class="fas fa-stop"></i>';
            this.fsAutotranscribeBtn.title = 'Stop Auto-transcribe';
        }
        
        this.showMessage(`Auto-transcribe started from ${this.formatTime(currentTime)}. Click the button again to stop.`, 'success');
        
        // Start the transcription interval
        this.transcriptionInterval = setInterval(() => {
            this.addNextTranscriptEntry();
        }, 2000); // Add new text every 2 seconds
    }

    stopAutotranscribe() {
        this.isTranscribing = false;
        
        if (this.transcriptionInterval) {
            clearInterval(this.transcriptionInterval);
            this.transcriptionInterval = null;
        }
        
        // Update button appearance
        this.autotranscribeBtn.classList.remove('transcribing');
        this.autotranscribeBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        this.autotranscribeBtn.title = 'Auto-transcribe from video';
        
        if (this.fsAutotranscribeBtn) {
            this.fsAutotranscribeBtn.classList.remove('transcribing');
            this.fsAutotranscribeBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.fsAutotranscribeBtn.title = 'Auto-transcribe from video';
        }
        
        this.showMessage('Auto-transcribe stopped.', 'success');
    }

    addNextTranscriptEntry() {
        if (this.currentTranscriptIndex >= this.transcriptEntries.length) {
            this.stopAutotranscribe();
            this.showMessage('Auto-transcribe completed - reached end of transcript', 'success');
            return;
        }
        
        const entry = this.transcriptEntries[this.currentTranscriptIndex];
        const textToAdd = entry.text + ' ';
        
        // Determine which editor is active
        const activeEditor = document.activeElement === this.fullscreenEditor ? this.fullscreenEditor : this.noteEditor;
        
        // Add text to the end of the editor
        const currentContent = activeEditor.value;
        activeEditor.value = currentContent + textToAdd;
        
        // Trigger change event
        if (activeEditor === this.noteEditor) {
            this.handleEditorChange();
        } else {
            this.handleFullscreenEditorChange();
        }
        
        // Move to next entry
        this.currentTranscriptIndex++;
        
        // Scroll to bottom of editor
        activeEditor.scrollTop = activeEditor.scrollHeight;
    }

    saveMasterTitle() {
        this.masterTitle = this.masterTitleInput.value.trim();
        localStorage.setItem('masterTitle', this.masterTitle);
        this.showMessage('Master title saved successfully!', 'success');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeNoteTaker();
});