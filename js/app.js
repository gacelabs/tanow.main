/**
 * TaNow Online - Main Application JavaScript
 * IPTV Channel Directory
 */

// API Endpoints
const API_BASE = 'https://iptv-org.github.io/api';
const API = {
    channels: `${API_BASE}/channels.json`,
    streams: `${API_BASE}/streams.json`,
    categories: `${API_BASE}/categories.json`,
    countries: `${API_BASE}/countries.json`,
    languages: `${API_BASE}/languages.json`,
    logos: `${API_BASE}/logos.json`
};

// Category Icons Mapping
const CATEGORY_ICONS = {
    'animation': 'ph-duotone ph-magic-wand',
    'auto': 'ph-duotone ph-car',
    'business': 'ph-duotone ph-briefcase',
    'classic': 'ph-duotone ph-film-reel',
    'comedy': 'ph-duotone ph-smiley',
    'cooking': 'ph-duotone ph-cooking-pot',
    'culture': 'ph-duotone ph-bank',
    'documentary': 'ph-duotone ph-video-camera',
    'education': 'ph-duotone ph-graduation-cap',
    'entertainment': 'ph-duotone ph-star',
    'family': 'ph-duotone ph-users-three',
    'general': 'ph-duotone ph-television',
    'kids': 'ph-duotone ph-baby',
    'legislative': 'ph-duotone ph-scales',
    'lifestyle': 'ph-duotone ph-heart',
    'movies': 'ph-duotone ph-film-slate',
    'music': 'ph-duotone ph-music-notes',
    'news': 'ph-duotone ph-newspaper',
    'outdoor': 'ph-duotone ph-mountains',
    'relax': 'ph-duotone ph-leaf',
    'religious': 'ph-duotone ph-cross',
    'science': 'ph-duotone ph-atom',
    'series': 'ph-duotone ph-monitor-play',
    'shop': 'ph-duotone ph-shopping-cart',
    'sports': 'ph-duotone ph-soccer-ball',
    'travel': 'ph-duotone ph-airplane',
    'weather': 'ph-duotone ph-cloud-sun',
    'xxx': 'ph-duotone ph-warning'
};

// Category Images
const CATEGORY_IMAGES = {
    'news': 'https://images.unsplash.com/photo-1586448911122-f74aa8e3e4b6?w=600',
    'sports': 'https://images.pexels.com/photos/200986/pexels-photo-200986.jpeg?w=600',
    'entertainment': 'https://images.pexels.com/photos/1983046/pexels-photo-1983046.jpeg?w=600',
    'movies': 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?w=600',
    'music': 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?w=600',
    'kids': 'https://images.pexels.com/photos/1148998/pexels-photo-1148998.jpeg?w=600',
    'documentary': 'https://images.pexels.com/photos/3617500/pexels-photo-3617500.jpeg?w=600',
    'general': 'https://images.pexels.com/photos/5202925/pexels-photo-5202925.jpeg?w=600'
};

// Global Data Store
let appData = {
    channels: [],
    streams: [],
    categories: [],
    countries: [],
    languages: [],
    logos: [],
    isLoading: true
};

// HLS Player Instance
let hlsPlayer = null;

// DOM Ready
$(document).ready(function() {
    initApp();
});

/**
 * Initialize Application
 */
async function initApp() {
    // Setup event listeners
    setupEventListeners();
    
    // Load data
    await loadAllData();
    
    // Render homepage content
    if ($('[data-testid="hero-section"]').length) {
        renderStats();
        renderCategories();
        renderCountries();
        renderLatestChannels();
    }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Mobile menu toggle
    $('[data-testid="mobile-menu-toggle"]').on('click', function() {
        $('[data-testid="mobile-nav"]').toggleClass('mobile-nav--active');
        const icon = $(this).find('i');
        icon.toggleClass('ph-list ph-x');
    });
    
    // Search toggle
    $('[data-testid="search-toggle"]').on('click', function() {
        $('[data-testid="search-overlay"]').addClass('search-overlay--active');
        $('[data-testid="search-input"]').focus();
    });
    
    // Search close
    $('[data-testid="search-close"]').on('click', function() {
        $('[data-testid="search-overlay"]').removeClass('search-overlay--active');
        $('[data-testid="search-input"]').val('');
        $('[data-testid="search-results"]').empty();
    });
    
    // Search input
    $('[data-testid="search-input"]').on('input', debounce(function() {
        const query = $(this).val().toLowerCase().trim();
        if (query.length >= 2) {
            performSearch(query);
        } else {
            $('[data-testid="search-results"]').empty();
        }
    }, 300));
    
    // Close search on escape
    $(document).on('keydown', function(e) {
        if (e.key === 'Escape') {
            $('[data-testid="search-overlay"]').removeClass('search-overlay--active');
            $('[data-testid="player-modal"]').removeClass('player-modal--active');
            stopPlayer();
        }
    });
    
    // Player modal close
    $('[data-testid="player-close"], .player-modal__backdrop').on('click', function() {
        closePlayer();
    });
}

/**
 * Load All Data from API
 */
async function loadAllData() {
    try {
        const [channels, streams, categories, countries, languages] = await Promise.all([
            fetchData(API.channels),
            fetchData(API.streams),
            fetchData(API.categories),
            fetchData(API.countries),
            fetchData(API.languages)
        ]);
        
        appData.channels = channels || [];
        appData.streams = streams || [];
        appData.categories = categories || [];
        appData.countries = countries || [];
        appData.languages = languages || [];
        appData.isLoading = false;
        
        // Store in localStorage for other pages
        try {
            localStorage.setItem('tanow_categories', JSON.stringify(appData.categories));
            localStorage.setItem('tanow_countries', JSON.stringify(appData.countries));
        } catch(e) {
            console.warn('LocalStorage not available');
        }
        
    } catch (error) {
        console.error('Error loading data:', error);
        appData.isLoading = false;
    }
}

/**
 * Fetch Data Helper
 */
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error);
        return [];
    }
}

/**
 * Render Stats
 */
function renderStats() {
    // Count channels
    const totalChannels = appData.channels.filter(c => !c.is_nsfw && !c.closed).length;
    
    // Count unique countries
    const uniqueCountries = new Set(appData.channels.map(c => c.country)).size;
    
    // Count categories
    const totalCategories = appData.categories.length;
    
    // Count languages
    const totalLanguages = appData.languages.length;
    
    // Animate counters
    animateCounter('#total-channels', totalChannels);
    animateCounter('#total-countries', uniqueCountries);
    animateCounter('#total-categories', totalCategories);
    animateCounter('#total-languages', totalLanguages);
}

/**
 * Animate Counter
 */
function animateCounter(selector, target) {
    const element = $(selector);
    const duration = 2000;
    const steps = 50;
    const stepValue = target / steps;
    const stepTime = duration / steps;
    let current = 0;
    
    const timer = setInterval(() => {
        current += stepValue;
        if (current >= target) {
            element.text(formatNumber(target));
            clearInterval(timer);
        } else {
            element.text(formatNumber(Math.floor(current)));
        }
    }, stepTime);
}

/**
 * Format Number
 */
function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K+';
    }
    return num.toString();
}

/**
 * Render Categories (Bento Grid)
 */
function renderCategories() {
    const container = $('[data-testid="categories-grid"]');
    container.empty();
    
    // Filter and sort categories (exclude NSFW, show top 8)
    const displayCategories = appData.categories
        .filter(cat => cat.id !== 'xxx')
        .slice(0, 8);
    
    // Count channels per category
    const categoryCounts = {};
    appData.channels.forEach(channel => {
        if (channel.categories && !channel.is_nsfw && !channel.closed) {
            channel.categories.forEach(cat => {
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
        }
    });
    
    displayCategories.forEach((category, index) => {
        const count = categoryCounts[category.id] || 0;
        const icon = CATEGORY_ICONS[category.id] || 'ph-duotone ph-television';
        const image = CATEGORY_IMAGES[category.id] || CATEGORY_IMAGES['general'];
        
        const card = `
            <a href="pages/channels.html?category=${category.id}" class="category-card" data-testid="category-${category.id}">
                <div class="category-card__bg">
                    <img src="${image}" alt="${category.name}" loading="lazy">
                </div>
                <div class="category-card__overlay"></div>
                <div class="category-card__content">
                    <div class="category-card__icon">
                        <i class="${icon}"></i>
                    </div>
                    <h3 class="category-card__name">${category.name}</h3>
                    <span class="category-card__count">${count} channels</span>
                </div>
            </a>
        `;
        container.append(card);
    });
}

/**
 * Render Countries
 */
function renderCountries() {
    const container = $('[data-testid="countries-grid"]');
    container.empty();
    
    // Count channels per country
    const countryCounts = {};
    appData.channels.forEach(channel => {
        if (channel.country && !channel.is_nsfw && !channel.closed) {
            countryCounts[channel.country] = (countryCounts[channel.country] || 0) + 1;
        }
    });
    
    // Sort countries by channel count and take top 12
    const sortedCountries = appData.countries
        .map(country => ({
            ...country,
            channelCount: countryCounts[country.code] || 0
        }))
        .filter(c => c.channelCount > 0)
        .sort((a, b) => b.channelCount - a.channelCount)
        .slice(0, 12);
    
    sortedCountries.forEach(country => {
        const card = `
            <a href="pages/channels.html?country=${country.code}" class="country-card" data-testid="country-${country.code}">
                <span class="country-card__flag">${country.flag}</span>
                <div class="country-card__info">
                    <span class="country-card__name">${country.name}</span>
                    <span class="country-card__count">${country.channelCount} channels</span>
                </div>
            </a>
        `;
        container.append(card);
    });
}

/**
 * Render Latest/Popular Channels
 */
function renderLatestChannels() {
    const container = $('[data-testid="latest-channels-grid"]');
    container.empty();
    
    // Create a map of streams for quick lookup
    const streamMap = {};
    appData.streams.forEach(stream => {
        if (stream.channel && !streamMap[stream.channel]) {
            streamMap[stream.channel] = stream;
        }
    });
    
    // Filter channels that have streams and aren't NSFW
    const channelsWithStreams = appData.channels
        .filter(channel => 
            !channel.is_nsfw && 
            !channel.closed && 
            streamMap[channel.id]
        )
        .slice(0, 10);
    
    channelsWithStreams.forEach(channel => {
        const stream = streamMap[channel.id];
        const category = channel.categories && channel.categories[0] ? channel.categories[0] : 'general';
        const country = appData.countries.find(c => c.code === channel.country);
        
        const card = `
            <div class="channel-card" data-testid="channel-${channel.id}" 
                 data-stream-url="${stream.url}"
                 data-channel-name="${escapeHtml(channel.name)}"
                 data-channel-country="${country ? country.name : ''}"
                 data-channel-category="${category}"
                 onclick="playChannel(this)">
                <div class="channel-card__thumbnail">
                    <img src="https://via.placeholder.com/320x180/141414/525252?text=${encodeURIComponent(channel.name.substring(0, 10))}" 
                         alt="${escapeHtml(channel.name)}" 
                         class="channel-card__logo"
                         loading="lazy">
                    <div class="channel-card__play">
                        <i class="ph-fill ph-play-circle"></i>
                    </div>
                    <span class="channel-card__live">Live</span>
                </div>
                <div class="channel-card__info">
                    <h4 class="channel-card__name">${escapeHtml(channel.name)}</h4>
                    <div class="channel-card__meta">
                        ${country ? `<span>${country.flag}</span>` : ''}
                        <span class="channel-card__category">${capitalizeFirst(category)}</span>
                    </div>
                </div>
            </div>
        `;
        container.append(card);
    });
}

/**
 * Perform Search
 */
function performSearch(query) {
    const resultsContainer = $('[data-testid="search-results"]');
    resultsContainer.empty();
    
    // Search channels
    const results = appData.channels
        .filter(channel => 
            !channel.is_nsfw && 
            !channel.closed &&
            (channel.name.toLowerCase().includes(query) ||
             (channel.alt_names && channel.alt_names.some(n => n.toLowerCase().includes(query))))
        )
        .slice(0, 10);
    
    if (results.length === 0) {
        resultsContainer.html(`
            <div class="empty-state">
                <p>No channels found for "${escapeHtml(query)}"</p>
            </div>
        `);
        return;
    }
    
    // Create stream map
    const streamMap = {};
    appData.streams.forEach(stream => {
        if (stream.channel && !streamMap[stream.channel]) {
            streamMap[stream.channel] = stream;
        }
    });
    
    results.forEach(channel => {
        const country = appData.countries.find(c => c.code === channel.country);
        const stream = streamMap[channel.id];
        const hasStream = !!stream;
        
        const result = `
            <div class="search-result" 
                 ${hasStream ? `onclick="playChannelFromSearch('${stream.url}', '${escapeHtml(channel.name)}', '${country ? country.name : ''}')"` : ''}
                 style="${!hasStream ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                <img src="https://via.placeholder.com/48x48/141414/525252?text=${encodeURIComponent(channel.name.substring(0, 2))}" 
                     alt="${escapeHtml(channel.name)}" 
                     class="search-result__logo">
                <div class="search-result__info">
                    <h4>${escapeHtml(channel.name)}</h4>
                    <span>${country ? country.flag + ' ' + country.name : ''} ${hasStream ? '' : '• No stream available'}</span>
                </div>
            </div>
        `;
        resultsContainer.append(result);
    });
}

/**
 * Play Channel
 */
function playChannel(element) {
    const streamUrl = $(element).data('stream-url');
    const channelName = $(element).data('channel-name');
    const channelCountry = $(element).data('channel-country');
    const channelCategory = $(element).data('channel-category');
    
    openPlayer(streamUrl, channelName, `${channelCountry} • ${capitalizeFirst(channelCategory)}`);
}

/**
 * Play Channel from Search
 */
function playChannelFromSearch(streamUrl, channelName, channelCountry) {
    openPlayer(streamUrl, channelName, channelCountry);
    $('[data-testid="search-overlay"]').removeClass('search-overlay--active');
}

/**
 * Open Player Modal
 */
function openPlayer(streamUrl, channelName, channelMeta) {
    const modal = $('[data-testid="player-modal"]');
    const video = document.getElementById('video-player');
    
    // Update channel info
    $('[data-testid="player-channel-name"]').text(channelName);
    $('[data-testid="player-channel-meta"]').text(channelMeta);
    
    // Show loading
    $('[data-testid="player-loading"]').addClass('player-modal__loading--active');
    $('[data-testid="player-error"]').removeClass('player-modal__error--active');
    
    // Show modal
    modal.addClass('player-modal--active');
    
    // Initialize HLS player
    initHLSPlayer(video, streamUrl);
}

/**
 * Initialize HLS Player
 */
function initHLSPlayer(videoElement, streamUrl) {
    // Stop any existing player
    stopPlayer();
    
    if (Hls.isSupported()) {
        hlsPlayer = new Hls({
            debug: false,
            enableWorker: true,
            lowLatencyMode: true
        });
        
        hlsPlayer.loadSource(streamUrl);
        hlsPlayer.attachMedia(videoElement);
        
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
            $('[data-testid="player-loading"]').removeClass('player-modal__loading--active');
            videoElement.play().catch(e => console.log('Autoplay blocked:', e));
        });
        
        hlsPlayer.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                $('[data-testid="player-loading"]').removeClass('player-modal__loading--active');
                $('[data-testid="player-error"]').addClass('player-modal__error--active');
                console.error('HLS Error:', data);
            }
        });
        
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoElement.src = streamUrl;
        videoElement.addEventListener('loadedmetadata', function() {
            $('[data-testid="player-loading"]').removeClass('player-modal__loading--active');
            videoElement.play().catch(e => console.log('Autoplay blocked:', e));
        });
        
        videoElement.addEventListener('error', function() {
            $('[data-testid="player-loading"]').removeClass('player-modal__loading--active');
            $('[data-testid="player-error"]').addClass('player-modal__error--active');
        });
    } else {
        $('[data-testid="player-loading"]').removeClass('player-modal__loading--active');
        $('[data-testid="player-error"]').addClass('player-modal__error--active');
    }
}

/**
 * Stop Player
 */
function stopPlayer() {
    const video = document.getElementById('video-player');
    
    if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
    }
    
    if (video) {
        video.pause();
        video.src = '';
        video.load();
    }
}

/**
 * Close Player Modal
 */
function closePlayer() {
    $('[data-testid="player-modal"]').removeClass('player-modal--active');
    stopPlayer();
}

/**
 * Helper: Escape HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Helper: Capitalize First Letter
 */
function capitalizeFirst(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Helper: Debounce
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally accessible
window.playChannel = playChannel;
window.playChannelFromSearch = playChannelFromSearch;
window.closePlayer = closePlayer;
