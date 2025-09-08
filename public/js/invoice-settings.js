document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('settingsForm');
    const notification = document.getElementById('notification');
    
    // Ambil hotelId dari URL
    const urlParts = window.location.pathname.split('/');
    const hotelId = urlParts[3]; // /admin/hotels/{hotelId}/settings

    // Fungsi untuk mengambil data pengaturan dan mengisi form
    const loadSettings = async () => {
        try {
            const response = await fetch(`/api/settings/${hotelId}/invoice`);
            if (!response.ok) throw new Error('Failed to fetch settings.');
            
            const settings = await response.json();
            
            document.getElementById('address').value = settings.address || '';
            document.getElementById('email').value = settings.email || '';
            document.getElementById('phone').value = settings.phone || '';
            document.getElementById('footerQuote').value = settings.footerQuote || '';
        } catch (error) {
            notification.textContent = error.message;
            notification.className = 'text-red-500';
        }
    };

    // Fungsi untuk menyimpan data pengaturan
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        notification.textContent = 'Saving...';
        notification.className = 'text-gray-500';

        try {
            const response = await fetch(`/api/settings/${hotelId}/invoice`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save settings.');
            }

            notification.textContent = 'Settings saved successfully!';
            notification.className = 'text-green-500';
        } catch (error) {
            notification.textContent = error.message;
            notification.className = 'text-red-500';
        }
    });

    // Muat pengaturan saat halaman dibuka
    loadSettings();
});