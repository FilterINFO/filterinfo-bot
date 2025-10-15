// Filters Management
const Filters = {
    API_BASE: 'http://localhost:5000/api',
    userFilters: {},
    allCategories: [],
    currentCountry: '',
    currentUserId: null,

    // Initialize filters with user ID from Telegram
    async initialize() {
        try {
            // Get user ID from Telegram Web App or URL
            this.currentUserId = this.getUserId();
            
            // Load categories
            const categoriesResponse = await fetch(`${this.API_BASE}/categories`);
            this.allCategories = await categoriesResponse.json();
            
            // Load user filters from API
            await this.loadUserFilters();
            
            this.updateFiltersBadge();
            
        } catch (error) {
            console.error('Ошибка инициализации фильтров:', error);
        }
    },

    // Get user ID from Telegram, URL or generate temporary one
    getUserId() {
        // Try to get from Telegram Web App
        if (window.Telegram && Telegram.WebApp) {
            const tgUser = Telegram.WebApp.initDataUnsafe.user;
            if (tgUser && tgUser.id) {
                return tgUser.id;
            }
        }
        
        // Try to get from URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const urlUserId = urlParams.get('user_id');
        if (urlUserId) {
            return urlUserId;
        }
        
        // Fallback to session-based ID
        return this.getOrCreateSessionId();
    },

    // Get or create session-based user ID
    getOrCreateSessionId() {
        let sessionId = sessionStorage.getItem('webapp_user_id');
        if (!sessionId) {
            sessionId = 'web_user_' + Date.now();
            sessionStorage.setItem('webapp_user_id', sessionId);
        }
        return sessionId;
    },

    // Load user filters from API
    async loadUserFilters() {
        try {
            const response = await fetch(`${this.API_BASE}/filters/${this.currentUserId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.filters && Object.keys(data.filters).length > 0) {
                this.userFilters = data.filters;
                console.log('✅ Фильтры загружены из API:', Object.keys(this.userFilters).length, 'источников');
            } else {
                // Initialize default filters if none exist
                console.log('🔄 Инициализация фильтров по умолчанию');
                await this.initializeDefaultFilters();
            }
            
        } catch (error) {
            console.error('Ошибка загрузки фильтров:', error);
            await this.initializeDefaultFilters();
        }
    },

    // Initialize default filters (all sources enabled)
    async initializeDefaultFilters() {
        this.userFilters = {};
        
        this.allCategories.forEach(category => {
            if (category.sources) {
                const sourcesList = JSON.parse(category.sources);
                sourcesList.forEach(source => {
                    if (source.name) {
                        this.userFilters[source.name] = true;
                    }
                });
            }
        });
        
        console.log('✅ Инициализированы фильтры по умолчанию:', Object.keys(this.userFilters).length, 'источников');
        
        // Save default filters to API
        await this.saveUserFilters();
    },

    // Save user filters to API
    async saveUserFilters() {
        try {
            const response = await fetch(`${this.API_BASE}/filters/${this.currentUserId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filters: this.userFilters
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                console.log('✅ Фильтры сохранены в API');
            } else {
                console.error('Ошибка сохранения фильтров:', result.error);
            }
            
        } catch (error) {
            console.error('Ошибка сохранения фильтров:', error);
        }
    },

    // Open countries modal
    async openCountriesModal() {
        const countriesList = document.getElementById('countriesList');
        if (!countriesList) {
            console.error('❌ Элемент countriesList не найден');
            return;
        }
        
        countriesList.innerHTML = '';
        
        this.allCategories.forEach(category => {
            const stats = this.getCategoryStats(category);
            
            const countryItem = document.createElement('div');
            countryItem.className = 'country-item';
            countryItem.innerHTML = `
                <span>🌍 ${category.category}</span>
                <span class="country-stats">${stats.active}/${stats.total}</span>
            `;
            countryItem.onclick = () => this.openSourcesModal(category);
            countriesList.appendChild(countryItem);
        });
        
        Modal.show('countriesModal');
    },

    // Open sources modal
    openSourcesModal(category) {
        this.currentCountry = category.category;
        
        const modalTitle = document.getElementById('sourcesModalTitle');
        if (modalTitle) {
            modalTitle.textContent = `🌍 ${category.category}`;
        }
        
        const sourcesList = document.getElementById('sourcesList');
        if (!sourcesList) {
            console.error('❌ Элемент sourcesList не найден');
            return;
        }
        
        sourcesList.innerHTML = '';
        
        if (category.sources) {
            const sources = JSON.parse(category.sources);
            
            sources.forEach(source => {
                if (source.name) {
                    const sourceItem = document.createElement('div');
                    sourceItem.className = 'source-item';
                    sourceItem.innerHTML = `
                        <div class="source-checkbox ${this.userFilters[source.name] ? 'checked' : ''}" 
                             onclick="Filters.toggleSource('${source.name.replace(/'/g, "\\'")}')"></div>
                        <span class="source-name">${source.name}</span>
                    `;
                    sourcesList.appendChild(sourceItem);
                }
            });
        }
        
        Modal.close('countriesModal');
        Modal.show('sourcesModal');
    },

    // Back to countries modal
    backToCountries() {
        Modal.close('sourcesModal');
        Modal.show('countriesModal');
        this.updateFiltersBadge();
    },

    // Toggle source with API save
    async toggleSource(sourceName) {
        this.userFilters[sourceName] = !this.userFilters[sourceName];
        
        // Update checkbox in real-time
        const sourceItems = document.querySelectorAll('#sourcesList .source-item');
        sourceItems.forEach(item => {
            const name = item.querySelector('.source-name').textContent;
            if (name === sourceName) {
                const checkbox = item.querySelector('.source-checkbox');
                checkbox.classList.toggle('checked', this.userFilters[sourceName]);
            }
        });
        
        this.updateFiltersBadge();
        
        // Save to API
        await this.saveUserFilters();
    },

    // Apply filters
    async applyFilters() {
        Modal.closeAll();
        this.updateFiltersBadge();
        
        // Save to API
        await this.saveUserFilters();
        
        News.loadNews();
    },

    // Reset all filters
    async resetFilters() {
        try {
            const response = await fetch(`${this.API_BASE}/filters/${this.currentUserId}/reset`, {
                method: 'POST'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            if (result.status === 'success') {
                this.userFilters = result.filters;
                this.updateFiltersBadge();
                Modal.closeAll();
                News.loadNews();
                console.log('✅ Все фильтры сброшены');
            } else {
                console.error('Ошибка сброса фильтров:', result.error);
            }
            
        } catch (error) {
            console.error('Ошибка сброса фильтров:', error);
            // Fallback to local reset
            await this.initializeDefaultFilters();
            this.updateFiltersBadge();
            Modal.closeAll();
            News.loadNews();
        }
    },

    // Get category statistics
    getCategoryStats(category) {
        let activeCount = 0;
        let totalCount = 0;
        
        if (category.sources) {
            const sourcesList = JSON.parse(category.sources);
            totalCount = sourcesList.filter(s => s.name).length;
            
            sourcesList.forEach(source => {
                if (source.name && this.userFilters[source.name]) {
                    activeCount++;
                }
            });
        }
        
        return { active: activeCount, total: totalCount };
    },

    // Update filters badge
    updateFiltersBadge() {
        const activeCount = Object.values(this.userFilters).filter(Boolean).length;
        const totalCount = Object.keys(this.userFilters).length;
        
        const badge = document.getElementById('filtersBadge');
        if (badge) {
            badge.textContent = `${activeCount}/${totalCount}`;
        }
        
        console.log(`📊 Статистика фильтров: ${activeCount}/${totalCount} активных`);
    },

    // Get active sources for news filtering
    getActiveSources() {
        return Object.keys(this.userFilters).filter(source => this.userFilters[source]);
    }
};
