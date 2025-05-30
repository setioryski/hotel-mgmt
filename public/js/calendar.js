// public/js/calendar.js

document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  try {
    // 1) Load all hotels
    const hotels = await fetchJSON('/api/hotels');                   

    calendarEl.innerHTML = '<h2 class="text-xl font-bold mb-4">Bookings</h2>';

    // 2) For each hotel, fetch its rooms & bookings
    for (const hotel of hotels) {
      // Section header
      const section = document.createElement('div');
      section.className = 'mb-6';
      section.innerHTML = `<h3 class="text-lg font-semibold mb-2">${hotel.name}</h3>`;

      // Fetch rooms & bookings for this hotel
      const rooms    = await fetchJSON(`/api/rooms?hotel=${hotel.id}`);
      const bookings = await fetchJSON(`/api/bookings?hotel=${hotel.id}`);

      // Build table skeleton
      const table = document.createElement('table');
      table.className = 'min-w-full bg-white rounded shadow';
      table.innerHTML = `
        <thead>
          <tr class="bg-gray-200">
            <th class="px-4 py-2">Room</th>
            <th class="px-4 py-2">Guest</th>
            <th class="px-4 py-2">Check-In</th>
            <th class="px-4 py-2">Check-Out</th>
            <th class="px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');

      // Populate rows
      bookings.forEach(b => {
        // Look up the room object by resourceId
        const roomObj   = rooms.find(r => r.id === b.resourceId);
        const roomLabel = roomObj
          ? `Room ${roomObj.number} (${roomObj.type})`
          : `#${b.resourceId}`;

        const guest    = b.title;
        const checkIn  = new Date(b.start).toLocaleDateString();
        const checkOut = new Date(b.end  ).toLocaleDateString();
        const status   = b.bgColor === '#999' ? 'Cancelled' : 'Confirmed';

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="border px-4 py-2">${roomLabel}</td>
          <td class="border px-4 py-2">${guest}</td>
          <td class="border px-4 py-2">${checkIn}</td>
          <td class="border px-4 py-2">${checkOut}</td>
          <td class="border px-4 py-2">${status}</td>
        `;
        tbody.appendChild(row);
      });

      section.appendChild(table);
      calendarEl.appendChild(section);
    }
  } catch (err) {
    console.error('Error loading calendar:', err);
    calendarEl.innerHTML = `
      <div class="text-red-600">
        Failed to load bookings: ${err.message}
      </div>
    `;
  }
});

// Helper: fetch + parse JSON, forward errors
async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  return res.json();
}
