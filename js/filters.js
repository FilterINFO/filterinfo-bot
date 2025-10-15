// Filters Management
const Filters = {
    // Apply filters
    async applyFilters() {
        try {
            // Filters are now automatically saved in App.js
            // Just show confirmation and update count
            await App.updateFilteredCount();
            alert('✅ Фильтры применены!');
            
        } catch (error) {
            console.error('Ошибка применения фильтров:', error);
            alert('❌ Ошибка применения фильтров');
        }
    }
};
