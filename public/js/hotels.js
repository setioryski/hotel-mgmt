// public/js/hotels.js

document.addEventListener('DOMContentLoaded', () => {
  const tableBody    = document.querySelector('#hotelsTable tbody');
  const modal        = document.getElementById('hotelModal');
  const modalTitle   = document.getElementById('modalTitle');
  const hotelForm    = document.getElementById('hotelForm');
  const newBtn       = document.getElementById('newHotelBtn');
  const cancelBtn    = document.getElementById('modalCancel');

  let editingId = null; // null = creating new; otherwise holds hotel.id

  // Open the modal for New or Edit
  function openModal(isEdit = false, hotel = {}) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modalTitle.textContent = isEdit ? 'Edit Hotel' : 'New Hotel';
    document.getElementById('hotelName').value    = hotel.name    || '';
    document.getElementById('hotelAddress').value = hotel.address || '';
    document.getElementById('hotelContact').value = hotel.contact || '';
    editingId = isEdit ? hotel.id : null;
  }

  // Close & reset
  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    hotelForm.reset();
    editingId = null;
  }

  // Load all hotels and render table rows
  async function loadHotels() {
    tableBody.innerHTML = `<tr>
      <td colspan="4" class="py-4 text-center text-gray-500">Loading…</td>
    </tr>`;
    try {
      const res    = await fetch('/api/hotels', { credentials: 'include' });
      const hotels = await res.json();
      tableBody.innerHTML = '';

      hotels.forEach(h => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="border px-4 py-2">${h.name}</td>
          <td class="border px-4 py-2">${h.address || ''}</td>
          <td class="border px-4 py-2">${h.contact || ''}</td>
          <td class="border px-4 py-2 space-x-2">
            <button data-id="${h.id}" class="editBtn text-blue-600 hover:underline">Edit</button>
            <button data-id="${h.id}" class="deleteBtn text-red-600 hover:underline">Delete</button>
          </td>
        `;
        tableBody.appendChild(row);
      });

      // Attach handlers
      document.querySelectorAll('.editBtn').forEach(btn => {
        btn.onclick = () => {
          const id    = btn.dataset.id;
          const hotel = hotels.find(x => x.id == id);
          openModal(true, hotel);
        };
      });

      document.querySelectorAll('.deleteBtn').forEach(btn => {
        btn.onclick = async () => {
          if (!confirm('Delete this hotel?')) return;
          const id = btn.dataset.id;
          await fetch(`/api/hotels/${id}`, {
            method: 'DELETE',
            credentials: 'include'
          });
          loadHotels();
        };
      });
    } catch (err) {
      tableBody.innerHTML = `<tr>
        <td colspan="4" class="py-4 text-center text-red-600">
          Failed to load hotels.
        </td>
      </tr>`;
      console.error(err);
    }
  }

  // Handle form submit (create or update)
  hotelForm.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = {
      name:    document.getElementById('hotelName').value.trim(),
      address: document.getElementById('hotelAddress').value.trim(),
      contact: document.getElementById('hotelContact').value.trim()
    };
    const url    = editingId ? `/api/hotels/${editingId}` : '/api/hotels';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save');
      closeModal();
      loadHotels();
    } catch (err) {
      alert('Error saving hotel: ' + err.message);
      console.error(err);
    }
  });

  // Open modal on “New Hotel” click
  newBtn.addEventListener('click', () => openModal(false));

  // Cancel button
  cancelBtn.addEventListener('click', closeModal);

  // Initial load
  loadHotels();
});
