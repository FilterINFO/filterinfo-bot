// Modal Management
const Modal = {
    // Show modal
    show(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'block';
        }
    },

    // Close modal
    close(id) {
        const modal = document.getElementById(id);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    // Close all modals
    closeAll() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    },

    // Initialize modals
    init() {
        // Close modals on outside click
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal-overlay')) {
                this.close(event.target.id);
            }
        });
    }
};
