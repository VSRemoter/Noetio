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
        
        this.initializeElements();
        this.bindEvents();
        this.loadNotes();
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
            code: document.getElementById('codeBtn'),
            quote: document.getElementById('quoteBtn'),
            h1: document.getElementById('h1Btn'),
            h2: document.getElementById('h2Btn'),
            h3: document.getElementById('h3Btn'),
            bulletList: document.getElementById('bulletListBtn'),
            numberList: document.getElementById('numberListBtn'),
            undo: document.getElementById('undoBtn'),
            redo: document.getElementById('redoBtn')
        };
        
        // Fullscreen toolbar buttons
        this.fsToolbarButtons = {
            bold: document.getElementById('fsBoldBtn'),
            italic: document.getElementById('fsItalicBtn'),
            code: document.getElementById('fsCodeBtn'),
            quote: document.getElementById('fsQuoteBtn'),
            h1: document.getElementById('fsH1Btn'),
            h2: document.getElementById('fsH2Btn'),
            h3: document.getElementById('fsH3Btn'),
            bulletList: document.getElementById('fsBulletListBtn'),
            numberList: document.getElementById('fsNumberListBtn'),
            undo: document.getElementById('fsUndoBtn'),
            redo: document.getElementById('fsRedoBtn')
        };

        this.descriptionBtn = document.getElementById('descriptionBtn');
        this.transcriptBtn = document.getElementById('transcriptBtn');
        this.videoExtraInfo = document.getElementById('videoExtraInfo');
        this.previewBtn = document.getElementById('previewBtn');
        this.previewModal = document.getElementById('previewModal');
        this.closePreviewBtn = document.getElementById('closePreviewBtn');
        this.markdownPreview = document.getElementById('markdownPreview');
        this.noteTitleInput = document.getElementById('noteTitleInput');
    }

    bindEvents() {
        // YouTube video loading
        this.loadVideoBtn.addEventListener('click', () => this.loadYouTubeVideo());
        this.youtubeLinkInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadYouTubeVideo();
        });

        // Note saving
        this.saveNoteBtn.addEventListener('click', () => this.saveNote());

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
        this.bindToolbarEvents();
        this.bindFullscreenToolbarEvents();

        if (this.descriptionBtn) this.descriptionBtn.addEventListener('click', () => this.toggleDescription());
        if (this.transcriptBtn) this.transcriptBtn.addEventListener('click', () => this.toggleTranscript());
        if (this.previewBtn) this.previewBtn.addEventListener('click', () => this.showPreview());
        if (this.closePreviewBtn) this.closePreviewBtn.addEventListener('click', () => this.hidePreview());
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
            case 'csv':
                this.downloadAllNotesCSV(filename);
                break;
        }
    }

    downloadAllNotesMarkdown(filename) {
        let markdown = `# YouTube Notes Collection\n\n`;
        markdown += `**Exported:** ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n\n`;
        markdown += `**Total Notes:** ${this.notes.length}\n\n`;
        markdown += `---\n\n`;

        this.notes.forEach((note, index) => {
            const noteTitle = note.title || note.videoTitle || 'Untitled Note';
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            
            markdown += `## ${index + 1}. ${noteTitle}\n\n`;
            markdown += `**Video:** [${note.videoTitle}](${note.videoUrl || 'N/A'})\n\n`;
            markdown += `**Created:** ${createdDate}\n`;
            markdown += `**Updated:** ${updatedDate}\n\n`;
            markdown += `**Content:**\n\n`;
            markdown += note.content + '\n\n';
            markdown += `---\n\n`;
        });
        
        this.downloadFile(markdown, `${filename}.md`, 'text/markdown');
        this.showMessage(`All ${this.notes.length} notes downloaded as Markdown successfully!`, 'success');
    }

    downloadAllNotesCSV(filename) {
        const csvData = [
            ['Note Number', 'Title', 'Video Title', 'Video URL', 'Created Date', 'Updated Date', 'Content']
        ];
        
        this.notes.forEach((note, index) => {
            const noteTitle = note.title || note.videoTitle || 'Untitled Note';
            const createdDate = new Date(note.createdAt).toLocaleDateString();
            const updatedDate = new Date(note.updatedAt).toLocaleDateString();
            const content = note.content.replace(/\n/g, ' ').replace(/"/g, '""');
            
            csvData.push([
                index + 1,
                noteTitle,
                note.videoTitle,
                note.videoUrl || '',
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
            return;
        }
        const videoId = this.extractYouTubeVideoId(url);
        if (!videoId) {
            this.showMessage('Invalid YouTube URL', 'error');
            return;
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
        // Wait for API to be ready
        window.onYouTubeIframeAPIReady = () => {
            this.createPlayer(videoId);
        };
        // If API is already loaded
        if (window.YT && window.YT.Player) {
            this.createPlayer(videoId);
        }
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
                let transcriptHtml = '<strong>Transcript:</strong><br><br>';
                data.transcript.forEach((entry, idx) => {
                    const time = this.formatTime(entry.start);
                    const text = entry.text;
                    transcriptHtml += `<div class="transcript-entry">
                        <span class="transcript-time clickable-time" data-seconds="${Math.floor(entry.start)}">[${time}]</span>
                        <span class="transcript-text">${text}</span>
                    </div>`;
                });
                this.videoExtraInfo.innerHTML = transcriptHtml;
                this.currentVideoTranscript = data.transcript;
                // Add click listeners to times
                this.addTranscriptTimeListeners();
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

    showPreview() {
        if (!window.marked) {
            this.showMessage('Markdown preview is loading, please try again in a moment.', 'error');
            return;
        }
        const title = this.noteTitleInput.value.trim();
        const content = this.noteEditor.value.trim();
        let md = '';
        if (title) md += `# ${title}\n\n`;
        md += content;
        this.markdownPreview.innerHTML = window.marked.parse(md);
        this.previewModal.classList.add('active');
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
                formattedText = `****${selectedText}****`;
                newCursorPos = start + 4;
                break;
            case 'italic':
                formattedText = `**${selectedText}**`;
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
            case 'bulletList':
                formattedText = `- ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'numberList':
                formattedText = `1. ${selectedText}`;
                newCursorPos = start + 3;
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
                formattedText = `****${selectedText}****`;
                newCursorPos = start + 4;
                break;
            case 'italic':
                formattedText = `**${selectedText}**`;
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
            case 'bulletList':
                formattedText = `- ${selectedText}`;
                newCursorPos = start + 2;
                break;
            case 'numberList':
                formattedText = `1. ${selectedText}`;
                newCursorPos = start + 3;
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
        const note = {
            id: this.currentNoteId || Date.now().toString(),
            videoUrl: videoUrl,
            videoTitle: this.videoTitle.textContent || 'Untitled Video',
            videoChannel: this.videoChannel.textContent || 'Unknown Channel',
            content: noteContent,
            title: noteTitle,
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
        this.clearEditor();
        this.showMessage('Note saved successfully!', 'success');
    }

    loadNotes() {
        this.notesList.innerHTML = '';
        if (this.notes.length === 0) {
            this.notesList.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">No saved notes yet</p>';
            return;
        }
        this.notes.forEach(note => {
            const noteElement = this.createNoteElement(note);
            this.notesList.appendChild(noteElement);
        });
    }

    createNoteElement(note) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-item';
        noteDiv.dataset.noteId = note.id;
        const title = note.title ? note.title : (note.videoTitle !== 'Untitled Video' ? note.videoTitle : 'Untitled Note');
        const preview = note.content.substring(0, 100) + (note.content.length > 100 ? '...' : '');
        const date = new Date(note.updatedAt).toLocaleDateString();
        noteDiv.innerHTML = `
            <div class="note-title">${title}</div>
            <div class="note-preview">${preview}</div>
            <div class="note-date">${date}</div>
        `;
        noteDiv.addEventListener('click', () => this.loadNote(note));
        return noteDiv;
    }

    loadNote(note) {
        this.currentNoteId = note.id;
        this.youtubeLinkInput.value = note.videoUrl || '';
        this.noteEditor.value = note.content || '';
        this.noteTitleInput.value = note.title || '';
        // Load video if URL exists
        if (note.videoUrl) {
            this.loadYouTubeVideo();
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
        
        // Headers
        this.toolbarButtons.h1.addEventListener('click', () => this.applyFormat('h1'));
        this.toolbarButtons.h2.addEventListener('click', () => this.applyFormat('h2'));
        this.toolbarButtons.h3.addEventListener('click', () => this.applyFormat('h3'));
        
        // Lists
        this.toolbarButtons.bulletList.addEventListener('click', () => this.applyFormat('bulletList'));
        this.toolbarButtons.numberList.addEventListener('click', () => this.applyFormat('numberList'));
        
        // Undo/Redo
        this.toolbarButtons.undo.addEventListener('click', () => this.undo());
        this.toolbarButtons.redo.addEventListener('click', () => this.redo());
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
        
        // Headers
        this.fsToolbarButtons.h1.addEventListener('click', () => this.applyFullscreenFormat('h1'));
        this.fsToolbarButtons.h2.addEventListener('click', () => this.applyFullscreenFormat('h2'));
        this.fsToolbarButtons.h3.addEventListener('click', () => this.applyFullscreenFormat('h3'));
        
        // Lists
        this.fsToolbarButtons.bulletList.addEventListener('click', () => this.applyFullscreenFormat('bulletList'));
        this.fsToolbarButtons.numberList.addEventListener('click', () => this.applyFullscreenFormat('numberList'));
        
        // Undo/Redo
        this.fsToolbarButtons.undo.addEventListener('click', () => this.fsUndo());
        this.fsToolbarButtons.redo.addEventListener('click', () => this.fsRedo());
    }

    convertMarkdownToHTML(markdown) {
        // Simple markdown to HTML conversion
        return markdown
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*\*(.*?)\*\*\*/g, '<strong>$1</strong>')
            .replace(/\*\*(.*?)\*\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)$/gm, '<p>$1</p>')
            .replace(/<p><\/p>/g, '')
            .replace(/<p><h/g, '<h')
            .replace(/<\/h\d><\/p>/g, '</h$1>');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new YouTubeNoteTaker();
});