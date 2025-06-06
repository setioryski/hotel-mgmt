// src/client/CalendarScheduler.jsx

import React, { useEffect, useState } from 'react';
import Scheduler, { SchedulerData, ViewTypes, DATE_FORMAT } from 'react-big-scheduler';
import moment from 'moment';
import 'react-big-scheduler/lib/css/style.css';

export default function CalendarScheduler() {
  // Scheduler state
  const [schedulerData, setSchedulerData] = useState(
    new SchedulerData(moment().format(DATE_FORMAT), ViewTypes.Month)
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
  const [newBookingSlot, setNewBookingSlot] = useState(null);

  // Form fields
  const [selectedRoom, setSelectedRoom] = useState('');
  const [selectedGuest, setSelectedGuest] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');

  // Helper to fetch JSON with cookies
  const fetchJSON = (url, opts = {}) =>
    fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts
    }).then(res => {
      if (!res.ok) throw new Error(`${url} → ${res.status} ${res.statusText}`);
      return res.json();
    });

  // Load hotels on mount
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then(data => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0]._id);
      })
      .catch(err => console.error('Failed to load hotels:', err));
  }, []);

  // Load guests on mount
  useEffect(() => {
    fetchJSON('/api/guests')
      .then(data => setGuests(data))
      .catch(err => console.error('Failed to load guests:', err));
  }, []);

  // Function to load rooms + bookings for selected hotel
  const loadData = () => {
    if (!selectedHotel) return;
    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`)
    ])
      .then(([rooms, bookings]) => {
        const resourceList = rooms.map(r => ({
          id: r._id,
          name: `Room ${r.number} (${r.type})`
        }));
        const eventList = bookings.map(b => ({
          id: b.id || b._id,
          resourceId: b.resourceId || b.room,
          title: b.title,
          start: moment(b.start).format('YYYY-MM-DD HH:mm'),
          end: moment(b.end).format('YYYY-MM-DD HH:mm'),
          bgColor: b.bgColor
        }));

        const newSD = new SchedulerData(
          schedulerData.startDate,
          schedulerData.viewType
        );
        newSD.setResources(resourceList);
        newSD.setEvents(eventList);

        setResources(resourceList);
        setEvents(eventList);
        setSchedulerData(newSD);
      })
      .catch(err => console.error('Failed to load data:', err));
  };

  // Reload when hotel changes
  useEffect(() => {
    loadData();
  }, [selectedHotel]);

  // Open booking modal when a timeslot is clicked
  const onSelectSlot = slot => {
    const date = moment(slot.start).format('YYYY-MM-DD');
    setNewBookingSlot(slot);
    setSelectedRoom(slot.resourceId);
    setBookingStart(date);
    setBookingEnd(moment(slot.start).add(1, 'days').format('YYYY-MM-DD'));
    setSelectedGuest('');
    setBookingModalVisible(true);
  };

  // Submit new booking
  const handleBookingSubmit = e => {
    e.preventDefault();
    if (!selectedRoom) return alert('Please select a room.');
    if (!selectedGuest) return alert('Please select a guest.');

    const startDateTime = `${bookingStart}T12:00:00`;
    const endDateTime = `${bookingEnd}T12:00:00`;
    if (new Date(startDateTime) >= new Date(endDateTime))
      return alert('Check-out must be after check-in.');

    fetchJSON('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        room: selectedRoom,
        guest: selectedGuest,
        startDate: startDateTime,
        endDate: endDateTime
      })
    })
      .then(() => {
        setBookingModalVisible(false);
        loadData();
      })
      .catch(err => console.error('Booking creation failed:', err));
  };

  const closeModal = () => setBookingModalVisible(false);

  // Update or cancel bookings
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
      .then(loadData)
      .catch(err => console.error('Booking update failed:', err));

  const onEventMove = (ev, slotId, start, end) =>
    updateBooking(ev.id, { room: slotId, startDate: start, endDate: end });

  const onEventResize = (ev, slotId, start, end) =>
    updateBooking(ev.id, { startDate: start, endDate: end });

  const onEventClick = ev => {
    if (!window.confirm('Cancel this booking?')) return;
    fetchJSON(`/api/bookings/${ev.id}`, { method: 'DELETE' })
      .then(loadData)
      .catch(err => console.error('Booking cancellation failed:', err));
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Booking Calendar</h1>

      {/* Hotel selector */}
      <div className="mb-4">
        <label className="mr-2 font-semibold">Select Hotel:</label>
        <select
          value={selectedHotel || ''}
          onChange={e => setSelectedHotel(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          {hotels.map(h => (
            <option key={h._id} value={h._id}>{h.name}</option>
          ))}
        </select>
      </div>

      <Scheduler
        schedulerData={schedulerData}
        prevClick={schedulerData.prev}
        nextClick={schedulerData.next}
        onSelectDate={schedulerData.setDate}
        onViewChange={v => {
          const newSD = new SchedulerData(
            schedulerData.startDate,
            v.viewType,
            false,
            v.isEventPerspective
          );
          newSD.setResources(resources);
          newSD.setEvents(events);
          setSchedulerData(newSD);
        }}
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
            <form onSubmit={handleBookingSubmit} className="space-y-4">

              <div>
                <label className="block font-medium">Room:</label>
                <select
                  value={selectedRoom}
                  onChange={e => setSelectedRoom(e.target.value)}
                  className="w-full border px-2 py-1 rounded"
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
                  value={selectedGuest}
                  onChange={e => setSelectedGuest(e.target.value)}
                  className="w-full border px-2 py-1 rounded"
                >
                  <option value="">— Select Guest —</option>
                  {guests.map(g => (
                    <option key={g._id} value={g._id}>
                      {g.name} ({g.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium">Check-in:</label>
                <input
                  type="date"
                  value={bookingStart}
                  onChange={e => setBookingStart(e.target.value)}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>

              <div>
                <label className="block font-medium">Check-out:</label>
                <input
                  type="date"
                  value={bookingEnd}
                  onChange={e => setBookingEnd(e.target.value)}
                  className="w-full border px-2 py-1 rounded"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Book
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
