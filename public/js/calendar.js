document.addEventListener('DOMContentLoaded', async () => {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) return;

  const hotels = await fetchJSON('/api/hotels').then(res => res.json());
  const bookings = await fetchJSON('/api/bookings').then(res => res.json());

  calendarEl.innerHTML = '<h2 class="text-xl font-bold mb-4">Bookings</h2>';

  hotels.forEach(hotel => {
    const section = document.createElement('div');
    section.className = 'mb-6';
    section.innerHTML = `<h3 class="text-lg font-semibold mb-2">${hotel.name}</h3>`;

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

    const hotelBookings = bookings.filter(b => b.hotelId === hotel.id);
    hotelBookings.forEach(b => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="border px-4 py-2">${b.room}</td>
        <td class="border px-4 py-2">${b.title}</td>
        <td class="border px-4 py-2">${new Date(b.start).toLocaleDateString()}</td>
        <td class="border px-4 py-2">${new Date(b.end).toLocaleDateString()}</td>
        <td class="border px-4 py-2">${b.status}</td>
      `;
      tbody.appendChild(row);
    });

    section.appendChild(table);
    calendarEl.appendChild(section);
  });
});

async function fetchJSON(url) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to fetch ' + url);
  return res.json();
}
