import React, { useEffect, useState } from 'react';
import Scheduler, { SchedulerData, ViewTypes, DATE_FORMAT } from 'react-big-scheduler';
import moment from 'moment';
import 'react-big-scheduler/lib/css/style.css';

export default function CalendarScheduler() {
  // Scheduler state with 30-minute granularity
  const [schedulerData, setSchedulerData] = useState(
    new SchedulerData(
      moment().format(DATE_FORMAT),
      ViewTypes.Month,
      false,
      false,
      { minuteStep: 30 }
    )
  );
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);

  // Hotel selector
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);

  // Guests for dropdown
  const [guests, setGuests] = useState([]);

  // Booking modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);

  // Form fields
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedGuest, setSelectedGuest] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [formError, setFormError] = useState('');

  // Generic JSON fetch helper
  const fetchJSON = async (url, opts = {}) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const data = await res.json();
    if (!res.ok) {
      const msg =
        data.msg ||
        (data.errors && data.errors.map(e => e.msg).join(', ')) ||
        `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  };

  // Load hotels on mount
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then(data => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0].id);
      })
      .catch(err => console.error('Failed to load hotels:', err));
  }, []);

  // Load guests on mount
  useEffect(() => {
    fetchJSON('/api/guests')
      .then(data => setGuests(data))
      .catch(err => console.error('Failed to load guests:', err));
  }, []);

  // Fetch rooms & bookings when hotel changes
  const loadData = () => {
    if (!selectedHotel) return;
    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`)
    ])
      .then(([rooms, bookings]) => {
        // Map rooms to scheduler resources
        const resourceList = rooms.map(r => ({
          id: r.id,
          name: `Room ${r.number} (${r.type})`
        }));

        // Map bookings to scheduler events, offset by 30 minutes
        const eventList = bookings.map(b => {
          const startTime = moment(b.start).add(30, 'minutes');
          const endTime = moment(b.end).subtract(30, 'minutes');
          return {
            id: b.id,
            resourceId: b.resourceId,
            title: b.title,
            start: startTime.format(DATE_FORMAT),
            end: endTime.format(DATE_FORMAT),
            bgColor: b.bgColor
          };
        });

        // Feed data into scheduler
        const sd = schedulerData;
        sd.setResources(resourceList);
        sd.setEvents(eventList);
        setResources(resourceList);
        setEvents(eventList);
        setSchedulerData(sd);
      })
      .catch(err => console.error('Failed to load data:', err));
  };

  useEffect(loadData, [selectedHotel]);

  // Open booking modal on empty slot click
  const onSelectSlot = slot => {
    const date = moment(slot.start).format('YYYY-MM-DD');
    setSelectedRoom(slot.resourceId);
    setBookingStart(date);
    setBookingEnd(moment(slot.start).add(1, 'days').format('YYYY-MM-DD'));
    setSelectedGuest('');
    setFormError('');
    setBookingModalVisible(true);
  };

  // Submit new booking with 12:30 check-in and 11:30 check-out
  const handleBookingSubmit = async e => {
    e.preventDefault();
    setFormError('');
    if (!selectedRoom) return setFormError('Please select a room.');
    if (!selectedGuest) return setFormError('Please select a guest.');

    const startDateTime = `${bookingStart}T12:30:00`;
    const endDateTime = `${bookingEnd}T11:30:00`;
    if (new Date(startDateTime) >= new Date(endDateTime)) {
      return setFormError('Check-out must be after check-in.');
    }

    try {
      await fetchJSON('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({ room: selectedRoom, guest: selectedGuest, startDate: startDateTime, endDate: endDateTime })
      });
      setBookingModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Booking creation failed:', err);
      setFormError(err.message);
    }
  };

  const closeModal = () => setBookingModalVisible(false);

  // Update and cancel booking handlers
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, { method: 'PUT', body: JSON.stringify(body) })
      .then(loadData)
      .catch(err => console.error('Booking update failed:', err));

  const onEventMove = (ev, slotId, start, end) => updateBooking(ev.id, { room: slotId, startDate: start, endDate: end });
  const onEventResize = (ev, slotId, start, end) => updateBooking(ev.id, { startDate: start, endDate: end });
  const onEventClick = ev => {
    if (!window.confirm('Cancel this booking?')) return;
    fetchJSON(`/api/bookings/${ev.id}`, { method: 'DELETE' })
      .then(loadData)
      .catch(err => console.error('Booking cancellation failed:', err));
  };

  // Scheduler callbacks
  const onViewChange = newView => {
    schedulerData.setViewType(+newView.viewType, newView.showAgenda, +newView.isEventPerspective);
    setSchedulerData(schedulerData);
  };

  const onSelectDate = date => {
    schedulerData.setDate(date);
    setSchedulerData(schedulerData);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Booking Calendar</h1>

      <div className="mb-4">
        <label className="mr-2 font-semibold">Select Hotel:</label>
        <select
          className="border px-2 py-1 rounded"
          value={selectedHotel || ''}
          onChange={e => setSelectedHotel(e.target.value)}
        >
          {hotels.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>

      <Scheduler
        schedulerData={schedulerData}
        resources={resources}
        events={events}
        onViewChange={onViewChange}
        onSelectDate={onSelectDate}
        eventItemClick={onEventClick}
        moveEvent={onEventMove}
        newEvent={onSelectSlot}
        updateEventStart={onEventResize}
        updateEventEnd={onEventResize}
      />

      {/* Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-semibold mb-4">New Booking</h2>
            {formError && <div className="text-red-600 mb-2">{formError}</div>}
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block font-medium">Room:</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={selectedRoom}
                  onChange={e => setSelectedRoom(e.target.value)}
                >
                  <option value="">— Select Room —</option>
                  {resources.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium">Guest:</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={selectedGuest}
                  onChange={e => setSelectedGuest(e.target.value)}
                >
                  <option value="">— Select Guest —</option>
                  {guests.map(g => (
                    <option key={g.id} value={g.id}>{g.name} ({g.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium">Check-In:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingStart}
                  onChange={e => setBookingStart(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium">Check-Out:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={bookingEnd}
                  onChange={e => setBookingEnd(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded border"
                >Cancel</button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
