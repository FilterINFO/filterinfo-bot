// Main Application
const App = {
    API_BASE: 'https://caa8c91a1b38cbcc31791e886fceb9a4.serveo.net/api',
    userFilters: {},

    // Initialize application
    async init() {
        try {
            // Initialize Telegram Web App
            if (window.Telegram && Telegram.WebApp) {
                Telegram.WebApp.ready();
                Telegram.WebApp.expand();
            }

            // Load saved filters
            this.loadSavedFilters();
            
            // Load initial data
            await this.loadDashboardData();
            await this.loadSources();
            await this.loadTopics();
            
            console.log('🚀 FilterINFO App initialized');
            
        } catch (error) {
            console.error('❌ Error initializing app:', error);
        }
    },

    // Load saved filters from localStorage
    loadSavedFilters() {
        try {
            const savedFilters = localStorage.getItem('userFilters');
            if (savedFilters) {
                this.userFilters = JSON.parse(savedFilters);
                console.log('✅ Loaded saved filters:', this.userFilters);
            } else {
                // Initialize default filters
                this.userFilters = {
                    sources: {},
                    topics: {},
                    countries: {}
                };
            }
        } catch (error) {
            console.error('Error loading filters:', error);
            this.userFilters = { sources: {}, topics: {}, countries: {} };
        }
    },

    // Save filters to localStorage
    saveFilters() {
        try {
            localStorage.setItem('userFilters', JSON.stringify(this.userFilters));
            console.log('✅ Filters saved:', this.userFilters);
        } catch (error) {
            console.error('Error saving filters:', error);
        }
    },

    // Load dashboard data
    async loadDashboardData() {
        try {
            const response = await fetch(`${this.API_BASE}/stats`);
            const stats = await response.json();

            // Calculate filtered count based on active sources
            const activeSourcesCount = Object.values(this.userFilters.sources).filter(Boolean).length;
            const totalSourcesCount = Object.keys(this.userFilters.sources).length;
            const filteredCount = activeSourcesCount > 0 ? Math.floor(stats.total_news * (activeSourcesCount / totalSourcesCount)) : 0;
            
            document.getElementById('totalNewsCount').textContent = Math.min(stats.total_news, 47);
            document.getElementById('filteredNewsCount').textContent = Math.min(filteredCount, 47);

        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    },

    // Load sources from API
    async loadSources() {
        try {
            const response = await fetch(`${this.API_BASE}/categories`);
            const categories = await response.json();
            
            this.renderSources(categories);
            
        } catch (error) {
            document.getElementById('sourcesContent').innerHTML = 
                '<div class="error-message">❌ Ошибка загрузки источников</div>';
        }
    },

    // Render sources to the page
    renderSources(categories) {
        const container = document.getElementById('sourcesContent');
        let html = '<div class="countries-grid">';
        
        categories.forEach(category => {
            // Count actual sources in this category
            let sourcesCount = 0;
            if (category.sources) {
                const sources = JSON.parse(category.sources);
                sourcesCount = sources.filter(s => s.name).length;
            }
            
            // Count active sources
            let activeCount = 0;
            if (category.sources) {
                const sources = JSON.parse(category.sources);
                sources.forEach(source => {
                    if (source.name && this.userFilters.sources[source.name]) {
                        activeCount++;
                    }
                });
            }
            
            // Set country state
            const isCountryActive = this.userFilters.countries[category.category] !== false;
            
            html += `
                <div class="country-item" onclick="App.toggleCountry('${category.category}')">
                    <div class="country-main">
                        <span class="expand-arrow">▶</span>
                        <div class="country-checkbox ${isCountryActive ? 'checked' : ''}" 
                             onclick="event.stopPropagation(); App.toggleCountryAll('${category.category}')"></div>
                        <span class="country-flag">${this.getCountryFlag(category.category)}</span>
                        <span class="country-name">${category.category}</span>
                        <div class="country-stats">${activeCount}/${sourcesCount}</div>
                    </div>
                </div>
                <div class="sources-grid" id="${category.category}Sources" style="display: none; margin-left: 20px;">
            `;
            
            // Parse sources from category
            if (category.sources) {
                const sources = JSON.parse(category.sources);
                sources.forEach(source => {
                    if (source.name) {
                        const isActive = this.userFilters.sources[source.name] !== false;
                        html += `
                            <div class="source-item" onclick="App.toggleSource('${source.name}')">
                                <div class="source-info">${source.name}</div>
                                <div class="source-checkbox ${isActive ? 'checked' : ''}"></div>
                            </div>
                        `;
                    }
                });
            }
            
            html += '</div>';
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    // Load topics from API
    async loadTopics() {
        try {
            // For now, use example data - in real app this would come from API
            const topics = [
                { name: 'Политика', icon: '🗳️', count: 12 },
                { name: 'Экономика', icon: '💼', count: 8 },
                { name: 'Технологии', icon: '🔬', count: 15 },
                { name: 'Спорт', icon: '⚽', count: 7 },
                { name: 'Культура', icon: '🎭', count: 3 },
                { name: 'Происшествия', icon: '🚨', count: 2 }
            ];
            
            this.renderTopics(topics);
            
        } catch (error) {
            document.getElementById('topicsContent').innerHTML = 
                '<div class="error-message">❌ Ошибка загрузки тем</div>';
        }
    },

    // Render topics to the page
    renderTopics(topics) {
        const container = document.getElementById('topicsContent');
        let html = '<div class="topics-grid">';
        
        topics.forEach(topic => {
            const isActive = this.userFilters.topics[topic.name] !== false;
            html += `
                <div class="topic-item" onclick="App.toggleTopic('${topic.name}')">
                    <div class="topic-main">
                        <div class="topic-checkbox ${isActive ? 'checked' : ''}"></div>
                        <span class="topic-icon">${topic.icon}</span>
                        <span class="topic-name">${topic.name}</span>
                        <div class="topic-stats">${topic.count} за час</div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    // Toggle section visibility
    toggleSection(sectionId) {
        const section = document.getElementById(sectionId);
        section.classList.toggle('open');
    },

    // Toggle country expansion
    toggleCountry(countryId) {
        const sources = document.getElementById(countryId + 'Sources');
        const countryItem = event.currentTarget;
        
        sources.style.display = sources.style.display === 'none' ? 'grid' : 'none';
        countryItem.classList.toggle('country-expanded');
    },

    // Toggle all sources in country
    toggleCountryAll(countryId) {
        const checkbox = event.currentTarget;
        const isNowActive = !checkbox.classList.contains('checked');
        checkbox.classList.toggle('checked');
        
        // Update country filter
        this.userFilters.countries[countryId] = isNowActive;
        
        // Toggle all sources in this country
        const sources = document.getElementById(countryId + 'Sources');
        const sourceCheckboxes = sources.querySelectorAll('.source-checkbox');
        sourceCheckboxes.forEach(cb => {
            cb.classList.toggle('checked', isNowActive);
            const sourceItem = cb.closest('.source-item');
            const sourceName = sourceItem.querySelector('.source-info').textContent;
            this.userFilters.sources[sourceName] = isNowActive;
        });
        
        // Update country stats
        this.updateCountryStats(countryId);
        this.saveFilters();
        this.updateFilteredCount();
    },

    // Toggle individual source
    toggleSource(sourceName) {
        const sourceItem = event.currentTarget;
        const checkbox = sourceItem.querySelector('.source-checkbox');
        const isNowActive = !checkbox.classList.contains('checked');
        checkbox.classList.toggle('checked');
        
        // Update source filter
        this.userFilters.sources[sourceName] = isNowActive;
        
        // Update parent country state
        const countryItem = sourceItem.closest('.sources-grid').previousElementSibling;
        const countryName = countryItem.querySelector('.country-name').textContent;
        this.updateCountryState(countryName);
        
        this.saveFilters();
        this.updateFilteredCount();
    },

    // Update country checkbox state based on its sources
    updateCountryState(countryName) {
        const sources = document.getElementById(countryName + 'Sources');
        const sourceCheckboxes = sources.querySelectorAll('.source-checkbox');
        const countryCheckbox = sources.previousElementSibling.querySelector('.country-checkbox');
        
        const activeCount = Array.from(sourceCheckboxes).filter(cb => cb.classList.contains('checked')).length;
        const totalCount = sourceCheckboxes.length;
        
        // Update country checkbox
        if (activeCount === 0) {
            countryCheckbox.classList.remove('checked');
            this.userFilters.countries[countryName] = false;
        } else if (activeCount === totalCount) {
            countryCheckbox.classList.add('checked');
            this.userFilters.countries[countryName] = true;
        } else {
            countryCheckbox.classList.remove('checked');
            this.userFilters.countries[countryName] = true; // Partial selection
        }
        
        // Update country stats
        this.updateCountryStats(countryName);
    },

    // Update country statistics display
    updateCountryStats(countryName) {
        const sources = document.getElementById(countryName + 'Sources');
        const sourceCheckboxes = sources.querySelectorAll('.source-checkbox');
        const countryStats = sources.previousElementSibling.querySelector('.country-stats');
        
        const activeCount = Array.from(sourceCheckboxes).filter(cb => cb.classList.contains('checked')).length;
        const totalCount = sourceCheckboxes.length;
        
        countryStats.textContent = `${activeCount}/${totalCount}`;
    },

    // Toggle topic
    toggleTopic(topicName) {
        const topicItem = event.currentTarget;
        const checkbox = topicItem.querySelector('.topic-checkbox');
        const isNowActive = !checkbox.classList.contains('checked');
        checkbox.classList.toggle('checked');
        
        // Update topic filter
        this.userFilters.topics[topicName] = isNowActive;
        
        this.saveFilters();
    },

    // Update filtered news count
    async updateFilteredCount() {
        try {
            const activeSourcesCount = Object.values(this.userFilters.sources).filter(Boolean).length;
            const totalSourcesCount = Object.keys(this.userFilters.sources).length;
            
            let filteredCount = 0;
            if (activeSourcesCount > 0 && totalSourcesCount > 0) {
                // Calculate approximate count based on active sources ratio
                const response = await fetch(`${this.API_BASE}/stats`);
                const stats = await response.json();
                filteredCount = Math.floor(stats.total_news * (activeSourcesCount / totalSourcesCount));
            }
            
            document.getElementById('filteredNewsCount').textContent = Math.min(filteredCount, 47);
        } catch (error) {
            console.error('Error updating filtered count:', error);
        }
    },

    // Get country flag emoji
    getCountryFlag(country) {
        const flags = {
            'Россия': '🇷🇺',
            'США': '🇺🇸',
            'Европа': '🇪🇺',
            'Украина': '🇺🇦',
            'Мир': '🌎'
        };
        return flags[country] || '🏴';
    },

    // Open news page
    openNewsPage() {
        // Save current filters before navigation
        this.saveFilters();
        window.location.href = 'news.html';
    }
};

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
