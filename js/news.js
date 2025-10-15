// News Page Management
const NewsPage = {
    API_BASE: '/api',
    currentFilters: {
        timePeriod: '1',
        sortBy: 'newest'
    },
    userFilters: {},

    // Initialize news page
    async init() {
        try {
            console.log('🚀 Initializing News Page...');

            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();
            }

            this.loadSavedFilters();
            await this.loadNews();
            
        } catch (error) {
            console.error('❌ Error initializing news page:', error);
            this.showError('❌ Ошибка: ' + error.message);
        }
    },

    // Load saved filters from localStorage
    loadSavedFilters() {
        try {
            const savedFilters = localStorage.getItem('userFilters');
            if (savedFilters) {
                this.userFilters = JSON.parse(savedFilters);
            } else {
                this.userFilters = { sources: {}, topics: {}, countries: {} };
            }
        } catch (error) {
            this.userFilters = { sources: {}, topics: {}, countries: {} };
        }
    },

    // Load and display news
    async loadNews() {
        try {
            const response = await fetch(this.API_BASE + '/news');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const news = await response.json();
            this.renderNews(news);
            
        } catch (error) {
            console.error('News loading error:', error);
            this.showError('❌ Ошибка загрузки новостей. Проверьте подключение к серверу.');
        }
    },

    // Render news to container
    renderNews(news) {
        const container = document.getElementById('newsContainer');
        const shownCount = document.getElementById('shownNewsCount');
        const totalCount = document.getElementById('totalNewsCount');
        
        if (!container) return;
        
        container.innerHTML = '';
        
        // Apply filters and sorting
        const filteredNews = this.applyFilters(news);
        
        // Update counters
        if (shownCount) shownCount.textContent = filteredNews.length;
        if (totalCount) totalCount.textContent = news.length;
        
        if (filteredNews.length === 0) {
            container.innerHTML = '<div class="error-message">📭 Новостей по выбранным фильтрам нет</div>';
            return;
        }
        
        filteredNews.forEach(item => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.innerHTML = `
                <div class="news-title-item">${item.title || 'Без заголовка'}</div>
                <div class="news-meta">
                    <span class="news-source">${item.source || 'Неизвестный источник'}</span>
                    <span class="news-time">${this.formatTime(item.time_utc)}</span>
                </div>
            `;
            
            // Make news item clickable if there's a link
            if (item.link && item.link !== '#') {
                newsItem.style.cursor = 'pointer';
                newsItem.onclick = () => {
                    window.open(item.link, '_blank');
                };
            }
            
            container.appendChild(newsItem);
        });
    },

    // Apply filters to news
    applyFilters(news) {
        let filtered = [...news];
        
        // Apply source filters
        const activeSources = Object.keys(this.userFilters.sources || {}).filter(
            source => this.userFilters.sources[source]
        );
        
        if (activeSources.length > 0) {
            filtered = filtered.filter(item => activeSources.includes(item.source));
        }
        
        // Time period filter
        const timePeriod = document.getElementById('timePeriod')?.value || '1';
        
        if (timePeriod !== 'all') {
            const hours = parseInt(timePeriod);
            const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
            filtered = filtered.filter(item => {
                if (!item.time_utc) return true;
                try {
                    const itemTime = new Date(item.time_utc);
                    return itemTime >= cutoffTime;
                } catch (e) {
                    return true;
                }
            });
        }
        
        // Sort news
        const sortBy = document.getElementById('sortBy')?.value || 'newest';
        
        filtered.sort((a, b) => {
            try {
                switch (sortBy) {
                    case 'newest':
                        return new Date(b.time_utc || 0) - new Date(a.time_utc || 0);
                    case 'oldest':
                        return new Date(a.time_utc || 0) - new Date(b.time_utc || 0);
                    case 'source':
                        return (a.source || '').localeCompare(b.source || '');
                    case 'country':
                        return (a.category || '').localeCompare(b.category || '');
                    case 'importance':
                        return (b.title?.length || 0) - (a.title?.length || 0);
                    default:
                        return 0;
                }
            } catch (e) {
                return 0;
            }
        });
        
        return filtered;
    },

    // Apply filters when changed
    applyFilters() {
        this.loadNews();
    },

    // Format time for display
    formatTime(utcTime) {
        if (!utcTime || utcTime === 'недавно') return 'недавно';
        
        try {
            let date;
            
            if (utcTime.includes('T')) {
                date = new Date(utcTime);
            } else if (utcTime.includes(' ')) {
                date = new Date(utcTime.replace(' ', 'T') + 'Z');
            } else {
                return utcTime;
            }
            
            if (isNaN(date.getTime())) {
                return utcTime;
            }
            
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / (3600000 * 24));
            
            if (diffMins < 1) {
                return 'только что';
            } else if (diffMins < 60) {
                return `${diffMins} мин назад`;
            } else if (diffHours < 24) {
                return `${diffHours} ч назад`;
            } else if (diffDays === 1) {
                return 'вчера';
            } else if (diffDays < 7) {
                return `${diffDays} дн назад`;
            } else {
                return date.toLocaleDateString('ru-RU');
            }
            
        } catch (e) {
            return utcTime;
        }
    },

    // Show error message
    showError(message) {
        const container = document.getElementById('newsContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">${message}</div>`;
        }
    },

    // Go back to main page
    goBack() {
        window.location.href = 'index.html';
    }
};

// Initialize news page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    NewsPage.init();
});
