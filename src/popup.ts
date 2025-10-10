interface VideoInfo {
    videoId: string | null;
    title: string;
}

interface ThumbnailQuality {
    quality: string;
    label: string;
}

class ThumbnailDownloader {
    private videoId: string | null = null;
    private videoTitle: string = '';

    private elements = {
        loading: document.getElementById('loading')!,
        error: document.getElementById('error')!,
        content: document.getElementById('content')!,
        errorMessage: document.querySelector('.error-message')!,
        videoTitle: document.querySelector('.video-title')!,
        thumbnailPreview: document.getElementById('thumbnail-preview') as HTMLImageElement,
        downloadButtons: document.querySelectorAll('.download-btn')
    };

    constructor() {
        this.init();
    }

    private async init(): Promise<void> {
        try {
            this.showLoading();
            await this.getVideoInfo();

            if (!this.videoId) {
                throw new Error('No YouTube video detected. Please open a YouTube video page.');
            }

            this.showContent();
            this.setupEventListeners();
            this.loadPreview('maxresdefault');
        } catch (error) {
            this.showError(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }

    private async getVideoInfo(): Promise<void> {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab.id) {
            throw new Error('Unable to access current tab');
        }

        // Check if we're on a YouTube page
        if (!tab.url?.includes('youtube.com')) {
            throw new Error('Please navigate to a YouTube video page');
        }

        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' }) as VideoInfo;

        this.videoId = response.videoId;
        this.videoTitle = response.title;

        if (!this.videoId) {
            throw new Error('Could not extract video ID from this page');
        }
    }

    private setupEventListeners(): void {
        this.elements.downloadButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const quality = (e.target as HTMLButtonElement).dataset.quality!;
                this.downloadThumbnail(quality);
            });
        });
    }

    private getThumbnailUrl(quality: string): string {
        return `https://i.ytimg.com/vi/${this.videoId}/${quality}.jpg`;
    }

    private async loadPreview(quality: string): Promise<void> {
        const url = this.getThumbnailUrl(quality);
        this.elements.thumbnailPreview.src = url;

        // Try maxresdefault first, fallback to sddefault if it fails
        this.elements.thumbnailPreview.onerror = () => {
            if (quality === 'maxresdefault') {
                this.loadPreview('sddefault');
            }
        };
    }

    private async downloadThumbnail(quality: string): Promise<void> {
        try {
            const url = this.getThumbnailUrl(quality);
            const filename = this.sanitizeFilename(`${this.videoTitle}_${quality}.jpg`);

            await chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true
            });
        } catch (error) {
            this.showError('Failed to download thumbnail. Please try again.');
        }
    }

    private sanitizeFilename(filename: string): string {
        // Remove invalid characters for filenames
        return filename
            .replace(/[<>:"/\\|?*]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 200); // Limit filename length
    }

    private showLoading(): void {
        this.elements.loading.classList.remove('hidden');
        this.elements.error.classList.add('hidden');
        this.elements.content.classList.add('hidden');
    }

    private showError(message: string): void {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.remove('hidden');
        this.elements.content.classList.add('hidden');
        this.elements.errorMessage.textContent = message;
    }

    private showContent(): void {
        this.elements.loading.classList.add('hidden');
        this.elements.error.classList.add('hidden');
        this.elements.content.classList.remove('hidden');
        this.elements.videoTitle.textContent = this.videoTitle;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ThumbnailDownloader();
});
