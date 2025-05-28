// public/js/calendar.js
console.log('📅 calendar.js loaded');

// helper to include JWT from localStorage on every request
function authFetch(url, opts = {}) {
  const token = localStorage.getItem('token');
  opts.headers = Object.assign({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }, opts.headers);
  opts.credentials = 'include';
  return fetch(url, opts);
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM ready — initializing calendar…');

  const hotelSelect = document.getElementById('hotel-select');
  const calendarEl  = document.getElementById('calendar');
  let calendar;

  // 1️⃣ Load hotels into dropdown
  const hotels = await authFetch('/api/hotels').then(r => r.json());
  hotels.forEach(h => {
    const opt = document.createElement('option');
    opt.value       = h._id;
    opt.textContent = h.name;
    hotelSelect.appendChild(opt);
  });

  // 2️⃣ Initialize calendar on first hotel
  if (hotels.length) initCalendar(hotels[0]._id);

  // 3️⃣ Switch calendar when hotel changes
  hotelSelect.addEventListener('change', () => initCalendar(hotelSelect.value));

  // Calendar setup function
  function initCalendar(hotelId) {
    if (calendar) calendar.destroy();

    calendar = new FullCalendar.Calendar(calendarEl, {
      // using Scheduler bundle auto-registration—no explicit plugins needed
      initialView: 'resourceTimelineMonth',
      resourceAreaHeaderContent: 'Rooms',
      height: 'auto',
      headerToolbar: {
        left:  'prev,next today',
        center:'title',
        right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth'
      },
      views: {
        resourceTimelineDay:   { buttonText: 'Day' },
        resourceTimelineWeek:  { buttonText: 'Week' },
        resourceTimelineMonth: { buttonText: 'Month' }
      },

      // fetch rooms as resources
      resources: async (fetchInfo, success, failure) => {
        try {
          const rooms = await authFetch(`/api/rooms?hotel=${hotelId}`).then(r => r.json());
          success(rooms.map(r => ({
            id:    r._id,
            title: `${r.number} (${r.type})`
          })));
        } catch (e) {
          failure(e);
        }
      },

      // fetch bookings as events
      events: {
        url:    `/api/bookings?hotel=${hotelId}`,
        method: 'GET',
        failure: () => alert('Could not load bookings')
      },

      selectable: true,
      editable:   true,

      // create new booking on select
      select: info => {
        const guestEmail = prompt('Guest email:');
        if (!guestEmail) {
          calendar.unselect();
          return;
        }
        authFetch('/api/bookings', {
          method: 'POST',
          body: JSON.stringify({
            room:      info.resource.id,
            guestEmail,
            startDate: info.startStr,
            endDate:   info.endStr
          })
        })
        .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
        .then(() => calendar.refetchEvents())
        .catch(err => {
          alert(err.msg || err.message || 'Booking failed');
          calendar.refetchEvents();
        });
      },

      // move or resize bookings
      eventDrop:   info => updateBooking(info.event),
      eventResize: info => updateBooking(info.event),

      // cancel booking on click
      eventClick: info => {
        if (!confirm('Cancel this booking?')) return;
        authFetch(`/api/bookings/${info.event.id}`, { method: 'DELETE' })
          .then(r => r.ok ? r.json() : r.json().then(e => Promise.reject(e)))
          .then(() => info.event.remove())
          .catch(err => alert(err.msg || err.message || 'Cancel failed'));
      }
    });

    calendar.render();

    // helper to persist date changes
    function updateBooking(event) {
      authFetch(`/api/bookings/${event.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          startDate: event.startStr,
          endDate:   event.endStr
        })
      })
      .then(r => {
        if (!r.ok) return r.json().then(e => Promise.reject(e));
        return r.json();
      })
      .catch(err => {
        alert(err.msg || err.message || 'Update failed');
        event.revert();
      });
    }
  }
});
