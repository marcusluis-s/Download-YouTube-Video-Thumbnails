interface VideoInfo {
    videoId: string | null;
    title: string;
}

function extractVideoId(): string | null {
    // Method 1: Extract from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoIdFromUrl = urlParams.get('v');

    if (videoIdFromUrl) {
        return videoIdFromUrl;
    }

    // Method 2: Extract from shortened URL (youtu.be)
    const pathMatch = window.location.pathname.match(/\/watch\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) {
        return pathMatch[1];
    }

    // Method 3: Extract from embed URL
    const embedMatch = window.location.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
        return embedMatch[1];
    }

    // Method 4: Try to find it in the page's meta tags
    const canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalLink) {
        const canonicalUrl = new URL(canonicalLink.href);
        const videoIdFromCanonical = new URLSearchParams(canonicalUrl.search).get('v');
        if (videoIdFromCanonical) {
            return videoIdFromCanonical;
        }
    }

    return null;
}

function getVideoTitle(): string {
    // Try to get title from meta tag
    const titleMeta = document.querySelector('meta[name="title"]') as HTMLMetaElement;
    if (titleMeta && titleMeta.content) {
        return titleMeta.content;
    }

    // Try to get title from page title
    const pageTitle = document.title;
    if (pageTitle && pageTitle !== 'YouTube') {
        return pageTitle.replace(' - YouTube', '');
    }

    // Try to get from h1 tag
    const h1Title = document.querySelector('h1.ytd-watch-metadata yt-formatted-string');
    if (h1Title && h1Title.textContent) {
        return h1Title.textContent.trim();
    }

    return 'YouTube Video';
}

function getVideoInfo(): VideoInfo {
    const videoId = extractVideoId();
    const title = getVideoTitle();

    return {
        videoId,
        title
    };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getVideoInfo') {
        const videoInfo = getVideoInfo();
        sendResponse(videoInfo);
    }
    return true;
});
