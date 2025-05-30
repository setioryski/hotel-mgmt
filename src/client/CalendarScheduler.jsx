// src/client/CalendarScheduler.jsx

import React, { useEffect, useState } from 'react';
import Scheduler, { SchedulerData, ViewTypes, DATE_FORMAT } from 'react-big-scheduler';
import moment from 'moment';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import 'react-big-scheduler/lib/css/style.css';

function CalendarScheduler() {
  // Scheduler state & data
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

  // Dropdown data
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [guests, setGuests] = useState([]);

  // “New Booking” modal state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [newRoom, setNewRoom] = useState('');
  const [newGuest, setNewGuest] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newError, setNewError] = useState('');

  // “View Booking” modal state
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [viewBooking, setViewBooking] = useState(null);

  // Generic fetch helper
  const fetchJSON = async (url, opts = {}) => {
    const res = await fetch(url, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...opts
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.msg || `${res.status} ${res.statusText}`);
    return data;
  };

  // Load hotels & guests on mount
  useEffect(() => {
    fetchJSON('/api/hotels')
      .then(data => {
        setHotels(data);
        if (data.length) setSelectedHotel(data[0].id);
      })
      .catch(console.error);

    fetchJSON('/api/guests')
      .then(setGuests)
      .catch(console.error);
  }, []);

  // Fetch rooms & bookings when hotel changes
  const loadData = () => {
    if (!selectedHotel) return;
    Promise.all([
      fetchJSON(`/api/rooms?hotel=${selectedHotel}`),
      fetchJSON(`/api/bookings?hotel=${selectedHotel}`)
    ])
      .then(([rooms, bookings]) => {
        const resList = rooms.map(r => ({
          id: r.id,
          name: `Room ${r.number} (${r.type})`
        }));
        const evList = bookings.map(b => ({
          id: b.id,
          resourceId: b.resourceId,
          title: b.title,
          start: moment(b.start).format(DATE_FORMAT),
          end: moment(b.end).format(DATE_FORMAT),
          bgColor: b.bgColor
        }));
        const sd = schedulerData;
        sd.setResources(resList);
        sd.setEvents(evList);
        setResources(resList);
        setEvents(evList);
        setSchedulerData(sd);
      })
      .catch(console.error);
  };
  useEffect(loadData, [selectedHotel]);

  // New booking: empty slot click
  const onSelectSlot = (sd, slotId, slotName, start, end) => {
    setNewRoom(slotId);
    setNewStart(moment(start).format('YYYY-MM-DD'));
    setNewEnd(moment(end).format('YYYY-MM-DD'));
    setNewGuest('');
    setNewError('');
    setBookingModalVisible(true);
  };

  // Submit new booking
  const handleNewSubmit = async e => {
    e.preventDefault();
    setNewError('');
    if (!newRoom || !newGuest) {
      return setNewError('Room & guest are required.');
    }
    const startDT = `${newStart}T12:00:00`;
    const endDT = `${newEnd}T12:00:00`;
    if (new Date(startDT) >= new Date(endDT)) {
      return setNewError('Check-out must be after check-in.');
    }
    try {
      await fetchJSON('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          room: newRoom,
          guest: newGuest,
          startDate: startDT,
          endDate: endDT
        })
      });
      setBookingModalVisible(false);
      loadData();
    } catch (err) {
      setNewError(err.message);
    }
  };

  // View booking: event click
  const onEventClick = async (sd, event) => {
    try {
      const booking = await fetchJSON(`/api/bookings/${event.id}`);
      setViewBooking({
        id: booking.id,
        guestName: booking.Guest.name,
        checkIn: moment(booking.startDate).format('YYYY-MM-DD'),
        checkOut: moment(booking.endDate).format('YYYY-MM-DD')
      });
      setViewModalVisible(true);
    } catch (err) {
      console.error('Failed to load booking details:', err);
      alert('Could not load booking details.');
    }
  };

  // Cancel booking from view modal
  const handleCancelBooking = async () => {
    if (!viewBooking) return;
    try {
      await fetchJSON(`/api/bookings/${viewBooking.id}`, { method: 'DELETE' });
      setViewModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Cancellation failed:', err);
      alert('Failed to cancel booking.');
    }
  };

  // Update booking on move/resize
  const updateBooking = (id, body) =>
    fetchJSON(`/api/bookings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    })
      .then(loadData)
      .catch(console.error);

  const onEventMove = (sd, event, slotId, newStart, newEnd) =>
    updateBooking(event.id, { room: slotId, startDate: newStart, endDate: newEnd });

  const onEventResize = (sd, event, newStart, newEnd) =>
    updateBooking(event.id, { startDate: newStart, endDate: newEnd });

  // View & date change callbacks
  const onViewChange = nv => {
    schedulerData.setViewType(+nv.viewType, nv.showAgenda, +nv.isEventPerspective);
    setSchedulerData(schedulerData);
  };

  const onSelectDate = date => {
    schedulerData.setDate(date);
    setSchedulerData(schedulerData);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Booking Calendar</h1>

      {/* Hotel selector */}
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

      {/* Scheduler */}
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

      {/* New Booking Modal */}
      {bookingModalVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-semibold mb-4">New Booking</h2>
            {newError && <div className="text-red-600 mb-2">{newError}</div>}
            <form onSubmit={handleNewSubmit} className="space-y-4">
              <div>
                <label className="block font-medium">Room:</label>
                <select
                  className="w-full border px-2 py-1 rounded"
                  value={newRoom}
                  onChange={e => setNewRoom(e.target.value)}
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
                  value={newGuest}
                  onChange={e => setNewGuest(e.target.value)}
                >
                  <option value="">— Select Guest —</option>
                  {guests.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium">Check-In:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium">Check-Out:</label>
                <input
                  type="date"
                  className="w-full border px-2 py-1 rounded"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setBookingModalVisible(false)}
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

      {/* View Booking Modal */}
      {viewModalVisible && viewBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-80">
            <h2 className="text-xl font-semibold mb-4">Booking Details</h2>
            <p><strong>Guest:</strong> {viewBooking.guestName}</p>
            <p><strong>Check-In:</strong> {viewBooking.checkIn}</p>
            <p><strong>Check-Out:</strong> {viewBooking.checkOut}</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => setViewModalVisible(false)}
                className="px-4 py-2 rounded border"
              >
                Close
              </button>
              <button
                onClick={handleCancelBooking}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Cancel Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DragDropContext(HTML5Backend)(CalendarScheduler);
