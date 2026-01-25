/**
 * TaNow Online - Pure Static Site
 * Tech Stack: HTML5, CSS3, jQuery
 * Data Source: https://iptv-org.github.io/api
 * Storage: localStorage for favorites
 */

// API Endpoints (iptv-org public API)
const API_BASE = 'https://iptv-org.github.io/api';
const API = {
    channels: `${API_BASE}/channels.json`,
    streams: `${API_BASE}/streams.json`,
    categories: `${API_BASE}/categories.json`,
    countries: `${API_BASE}/countries.json`,
    languages: `${API_BASE}/languages.json`
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
    isLoading: true
};

// HLS Player Instance
let hlsPlayer = null;

// ============================================
// LOCALSTORAGE HELPERS (No Database Required)
// ============================================

const Storage = {
    // Get favorites from localStorage
    getFavorites: function() {
        try {
            return JSON.parse(localStorage.getItem('tanow_favorites')) || [];
        } catch (e) {
            return [];
        }
    },
    
    // Save favorites to localStorage
    saveFavorites: function(favorites) {
        try {
            localStorage.setItem('tanow_favorites', JSON.stringify(favorites));
        } catch (e) {
            console.warn('Could not save to localStorage');
        }
    },
    
    // Add channel to favorites
    addFavorite: function(channelId) {
        const favorites = this.getFavorites();
        if (!favorites.includes(channelId)) {
            favorites.push(channelId);
            this.saveFavorites(favorites);
        }
        return favorites;
    },
    
    // Remove channel from favorites
    removeFavorite: function(channelId) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(id => id !== channelId);
        this.saveFavorites(favorites);
        return favorites;
    },
    
    // Check if channel is favorite
    isFavorite: function(channelId) {
        return this.getFavorites().includes(channelId);
    },
    
    // Get recently watched
    getRecentlyWatched: function() {
        try {
            return JSON.parse(localStorage.getItem('tanow_recent')) || [];
        } catch (e) {
            return [];
        }
    },
    
    // Add to recently watched
    addRecentlyWatched: function(channelId) {
        let recent = this.getRecentlyWatched();
        recent = recent.filter(id => id !== channelId);
        recent.unshift(channelId);
        recent = recent.slice(0, 20); // Keep only last 20
        try {
            localStorage.setItem('tanow_recent', JSON.stringify(recent));
        } catch (e) {
            console.warn('Could not save to localStorage');
        }
    }
};

// ============================================
// DOM READY - Initialize App
// ============================================

$(document).ready(function() {
    initApp();
});

/**
 * Initialize Application
 */
async function initApp() {
    // Setup event listeners
    setupEventListeners();
    
    // Load data from iptv-org API using jQuery
    await loadAllData();
    
    // Render homepage content if on homepage
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
    
    // Search input with debounce
    let searchTimeout;
    $('[data-testid="search-input"]').on('input', function() {
        clearTimeout(searchTimeout);
        const query = $(this).val().toLowerCase().trim();
        searchTimeout = setTimeout(function() {
            if (query.length >= 2) {
                performSearch(query);
            } else {
                $('[data-testid="search-results"]').empty();
            }
        }, 300);
    });
    
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
 * Load All Data from iptv-org API using jQuery AJAX
 */
async function loadAllData() {
    try {
        // Use jQuery.when for parallel requests
        const results = await Promise.all([
            $.getJSON(API.channels),
            $.getJSON(API.streams),
            $.getJSON(API.categories),
            $.getJSON(API.countries),
            $.getJSON(API.languages)
        ]);
        
        appData.channels = results[0] || [];
        appData.streams = results[1] || [];
        appData.categories = results[2] || [];
        appData.countries = results[3] || [];
        appData.languages = results[4] || [];
        appData.isLoading = false;
        
    } catch (error) {
        console.error('Error loading data from iptv-org API:', error);
        appData.isLoading = false;
    }
}

/**
 * Render Stats
 */
function renderStats() {
    const totalChannels = appData.channels.filter(c => !c.is_nsfw && !c.closed).length;
    const uniqueCountries = new Set(appData.channels.map(c => c.country)).size;
    const totalCategories = appData.categories.length;
    const totalLanguages = appData.languages.length;
    
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
    
    const timer = setInterval(function() {
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
    
    const displayCategories = appData.categories
        .filter(cat => cat.id !== 'xxx')
        .slice(0, 8);
    
    const categoryCounts = {};
    appData.channels.forEach(function(channel) {
        if (channel.categories && !channel.is_nsfw && !channel.closed) {
            channel.categories.forEach(function(cat) {
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
        }
    });
    
    displayCategories.forEach(function(category) {
        const count = categoryCounts[category.id] || 0;
        const icon = CATEGORY_ICONS[category.id] || 'ph-duotone ph-television';
        const image = CATEGORY_IMAGES[category.id] || CATEGORY_IMAGES['general'];
        
        const card = `
            <a href="/pages/channels.html?category=${category.id}" class="category-card" data-testid="category-${category.id}">
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
    
    const countryCounts = {};
    appData.channels.forEach(function(channel) {
        if (channel.country && !channel.is_nsfw && !channel.closed) {
            countryCounts[channel.country] = (countryCounts[channel.country] || 0) + 1;
        }
    });
    
    const sortedCountries = appData.countries
        .map(function(country) {
            return {
                ...country,
                channelCount: countryCounts[country.code] || 0
            };
        })
        .filter(function(c) { return c.channelCount > 0; })
        .sort(function(a, b) { return b.channelCount - a.channelCount; })
        .slice(0, 12);
    
    sortedCountries.forEach(function(country) {
        const card = `
            <a href="/pages/channels.html?country=${country.code}" class="country-card" data-testid="country-${country.code}">
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
    
    const streamMap = {};
    appData.streams.forEach(function(stream) {
        if (stream.channel && !streamMap[stream.channel]) {
            streamMap[stream.channel] = stream;
        }
    });
    
    const channelsWithStreams = appData.channels
        .filter(function(channel) {
            return !channel.is_nsfw && !channel.closed && streamMap[channel.id];
        })
        .slice(0, 10);
    
    channelsWithStreams.forEach(function(channel) {
        const stream = streamMap[channel.id];
        const category = channel.categories && channel.categories[0] ? channel.categories[0] : 'general';
        const country = appData.countries.find(function(c) { return c.code === channel.country; });
        const isFav = Storage.isFavorite(channel.id);
        
        const card = `
            <div class="channel-card" data-testid="channel-${channel.id}" 
                 data-stream-url="${stream.url}"
                 data-channel-id="${channel.id}"
                 data-channel-name="${escapeHtml(channel.name)}"
                 data-channel-country="${country ? country.name : ''}"
                 data-channel-category="${category}"
                 onclick="playChannel(this)">
                <div class="channel-card__thumbnail">
                    <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, var(--bg-page) 0%, var(--bg-card) 100%);">
                        <span style="font-size: 1.25rem; font-weight: 700; color: var(--text-muted); text-align: center; padding: 0.5rem;">${escapeHtml(channel.name.substring(0, 12))}</span>
                    </div>
                    <div class="channel-card__play">
                        <i class="ph-fill ph-play-circle"></i>
                    </div>
                    <span class="channel-card__live">Live</span>
                    ${isFav ? '<span class="channel-card__fav"><i class="ph-fill ph-heart"></i></span>' : ''}
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
    
    const results = appData.channels
        .filter(function(channel) {
            return !channel.is_nsfw && !channel.closed &&
                (channel.name.toLowerCase().includes(query) ||
                 (channel.alt_names && channel.alt_names.some(function(n) { 
                     return n.toLowerCase().includes(query); 
                 })));
        })
        .slice(0, 10);
    
    if (results.length === 0) {
        resultsContainer.html(`
            <div class="empty-state">
                <p>No channels found for "${escapeHtml(query)}"</p>
            </div>
        `);
        return;
    }
    
    const streamMap = {};
    appData.streams.forEach(function(stream) {
        if (stream.channel && !streamMap[stream.channel]) {
            streamMap[stream.channel] = stream;
        }
    });
    
    results.forEach(function(channel) {
        const country = appData.countries.find(function(c) { return c.code === channel.country; });
        const stream = streamMap[channel.id];
        const hasStream = !!stream;
        
        const result = `
            <div class="search-result" 
                 ${hasStream ? `onclick="playChannelFromSearch('${stream.url}', '${escapeHtml(channel.name)}', '${country ? country.name : ''}', '${channel.id}')"` : ''}
                 style="${!hasStream ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                <div style="width: 48px; height: 48px; background: var(--bg-card); border-radius: var(--border-radius); display: flex; align-items: center; justify-content: center;">
                    <i class="ph-duotone ph-television" style="color: var(--accent-primary);"></i>
                </div>
                <div class="search-result__info">
                    <h4>${escapeHtml(channel.name)}</h4>
                    <span>${country ? country.flag + ' ' + country.name : ''} ${hasStream ? '' : '• No stream'}</span>
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
    const $el = $(element);
    const streamUrl = $el.data('stream-url');
    const channelId = $el.data('channel-id');
    const channelName = $el.data('channel-name');
    const channelCountry = $el.data('channel-country');
    const channelCategory = $el.data('channel-category');
    
    // Add to recently watched (localStorage)
    Storage.addRecentlyWatched(channelId);
    
    openPlayer(streamUrl, channelName, `${channelCountry} • ${capitalizeFirst(channelCategory)}`, channelId);
}

/**
 * Play Channel from Search
 */
function playChannelFromSearch(streamUrl, channelName, channelCountry, channelId) {
    Storage.addRecentlyWatched(channelId);
    openPlayer(streamUrl, channelName, channelCountry, channelId);
    $('[data-testid="search-overlay"]').removeClass('search-overlay--active');
}

/**
 * Open Player Modal
 */
function openPlayer(streamUrl, channelName, channelMeta, channelId) {
    const modal = $('[data-testid="player-modal"]');
    const video = document.getElementById('video-player');
    
    // Update channel info
    $('[data-testid="player-channel-name"]').text(channelName);
    $('[data-testid="player-channel-meta"]').text(channelMeta);
    
    // Update favorite button
    const isFav = Storage.isFavorite(channelId);
    $('.player-modal__fav-btn').attr('data-channel-id', channelId);
    $('.player-modal__fav-btn i').attr('class', isFav ? 'ph-fill ph-heart' : 'ph ph-heart');
    
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
            videoElement.play().catch(function(e) { console.log('Autoplay blocked:', e); });
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
        $(videoElement).on('loadedmetadata', function() {
            $('[data-testid="player-loading"]').removeClass('player-modal__loading--active');
            videoElement.play().catch(function(e) { console.log('Autoplay blocked:', e); });
        });
        
        $(videoElement).on('error', function() {
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
 * Toggle Favorite
 */
function toggleFavorite(channelId) {
    if (Storage.isFavorite(channelId)) {
        Storage.removeFavorite(channelId);
        $('.player-modal__fav-btn i').attr('class', 'ph ph-heart');
    } else {
        Storage.addFavorite(channelId);
        $('.player-modal__fav-btn i').attr('class', 'ph-fill ph-heart');
    }
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

// Make functions globally accessible
window.playChannel = playChannel;
window.playChannelFromSearch = playChannelFromSearch;
window.closePlayer = closePlayer;
window.toggleFavorite = toggleFavorite;
window.Storage = Storage;
