document.addEventListener('DOMContentLoaded', () => {
  const loginForm  = document.getElementById('loginForm');
  const calendarEl = document.getElementById('calendar');

  // 1️⃣ Handle login
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = loginForm.email.value;
    const password = loginForm.password.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) throw new Error('Login failed');
      const { token } = await res.json();
      localStorage.setItem('token', token);
      initCalendar();    // proceed after login
      loginForm.style.display  = 'none';
      calendarEl.style.display = 'block';
    } catch (err) {
      alert(err.message);
    }
  });

  // 2️⃣ If already logged in, skip form
  if (localStorage.getItem('token')) {
    loginForm.style.display  = 'none';
    calendarEl.style.display = 'block';
    initCalendar();
  } else {
    calendarEl.style.display = 'none';
  }

  // 3️⃣ Calendar initialization
  async function initCalendar() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // load rooms as resources
    let rooms = [];
    try {
      const res = await fetch('/api/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      rooms = await res.json();
    } catch (err) {
      alert(err.message);
      return;
    }

    const { Calendar }               = FullCalendar;
    const { ResourceTimelinePlugin } = FullCalendarResourceTimeline;
    const { InteractionPlugin }      = FullCalendarInteraction;

    const calendar = new Calendar(calendarEl, {
      plugins: [ ResourceTimelinePlugin, InteractionPlugin ],
      initialView: 'resourceTimelineDay',
      resourceAreaHeaderContent: 'Rooms',
      resources: rooms.map(r => ({ id: r._id, title: `Room ${r.number}` })),
      events: {
        url: '/api/bookings',
        headers: { Authorization: `Bearer ${token}` },
        failure() { alert('Error loading bookings'); }
      },
      selectable: true,
      editable: true,

      // Create booking
      select: info => {
        const guestEmail = prompt('Guest email:');
        if (!guestEmail) return;
        fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            room:      info.resource.id,
            startDate: info.startStr,
            endDate:   info.endStr,
            guestEmail
          })
        })
        .then(r => {
          if (!r.ok) throw new Error('Booking failed');
          return r.json();
        })
        .then(() => calendar.refetchEvents())
        .catch(err => alert(err.message));
      },

      // Move booking
      eventDrop: info => {
        fetch(`/api/bookings/${info.event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            startDate: info.event.startStr,
            endDate:   info.event.endStr
          })
        })
        .catch(() => {
          alert('Could not move booking');
          info.revert();
        });
      },

      // Resize booking
      eventResize: info => {
        fetch(`/api/bookings/${info.event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            startDate: info.event.startStr,
            endDate:   info.event.endStr
          })
        })
        .catch(() => {
          alert('Could not resize booking');
          info.revert();
        });
      },

      // Cancel booking
      eventClick: info => {
        if (!confirm('Cancel this booking?')) return;
        fetch(`/api/bookings/${info.event.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        })
        .then(r => {
          if (!r.ok) throw new Error('Cancel failed');
          info.event.remove();
        })
        .catch(err => alert(err.message));
      }
    });

    calendar.render();
  }
});


document.addEventListener('DOMContentLoaded', () => {
  let calendar = new FullCalendar.Calendar(
    document.getElementById('calendar'),
    {
      plugins: [
        FullCalendarInteraction,
        FullCalendarDayGrid,
        FullCalendarTimeGrid,
        FullCalendarList,
        FullCalendarTimeline,
        FullCalendarResourceTimeline
      ],
      initialView: 'resourceTimelineWeek',
      resources: '/api/rooms',
      events:    '/api/bookings',
      editable:  true,
      selectable: true
    }
  );
  calendar.render();
});
