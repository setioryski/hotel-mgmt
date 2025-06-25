// src/client/CalendarScheduler.jsx

// ──────────────────────────────────────────────────────────────
// Imports & Third-Party Setup
// ──────────────────────────────────────────────────────────────
import React, { useEffect, useState, useRef, useMemo } from 'react';
import Scheduler, {
  ViewTypes,
} from 'react-big-scheduler';
import moment from 'moment';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import 'react-big-scheduler/lib/css/style.css';
import io from 'socket.io-client'; // ADDED: For real-time updates

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Modular & Service Imports
import { ApiService } from './services/ApiService';
import { SchedulerService } from './services/SchedulerService';
import ConfirmModal from './components/ConfirmModal';
import SchedulerToolbar from './components/SchedulerToolbar';
import SchedulerLegend from './components/SchedulerLegend';
import BookingModal from './components/BookingModal';
import BlockModal from './components/BlockModal';
import MobileBookingBar from './components/MobileBookingBar';


// Prevent mobile text selection & allow taps
const CELL_CSS_OVERRIDES = {
  touchAction: 'manipulation',
  userSelect: 'none',
};

// ──────────────────────────────────────────────────────────────
// CalendarScheduler: main booking/block calendar component
// ──────────────────────────────────────────────────────────────
function CalendarScheduler({ initialHotelId }) {
  // OOP Service Initialization
  const apiService = useMemo(() => new ApiService(), []);
  const schedulerService = useMemo(() => new SchedulerService(), []);

  const isMobile = window.innerWidth < 768;
  
  // State to trigger re-renders when scheduler data changes
  const [schedulerVersion, setSchedulerVersion] = useState(0);

  // State for scheduler data
  const [resources, setResources] = useState([]);
  const [events, setEvents] = useState([]);
  
  // Core state hooks
  const [blockedRoomsAll, setBlockedRoomsAll] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selectedRoomType, setSelectedRoomType] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlockMode, setIsBlockMode] = useState(false);
  const [currentView, setCurrentView] = useState(ViewTypes.Month);

  // Mobile-specific booking flow state
  const [mobileBookingRoom, setMobileBookingRoom] = useState(null);
  const [mobileCheckin, setMobileCheckin] = useState('');
  const [mobileCheckout, setMobileCheckout] = useState('');

  // Guest autocomplete & inline add/edit state
  const [guests, setGuests] = useState([]);
  const [guestSearch, setGuestSearch] = useState('');
  const [showGuestSuggestions, setShowGuestSuggestions] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState('');
  const [newGuestMode, setNewGuestMode] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestPhone, setNewGuestPhone] = useState('');
  const [newGuestError, setNewGuestError] = useState('');
  const [editingGuestMode, setEditingGuestMode] = useState(false);
  const [editingGuestName, setEditingGuestName] = useState('');
  const [editingGuestEmail, setEditingGuestEmail] = useState('');
  const [editingGuestPhone, setEditingGuestPhone] = useState('');
  const [editingGuestError, setEditingGuestError] = useState('');

  // Booking modal & form state
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [isEditingBooking, setIsEditingBooking] = useState(false);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [bookingStart, setBookingStart] = useState('');
  const [bookingEnd, setBookingEnd] = useState('');
  const [bookingStatus, setBookingStatus] = useState('tentative');
  const [bookingFormError, setBookingFormError] = useState('');
  const [bookingPrice, setBookingPrice] = useState('');
  const [roomPrices, setRoomPrices] = useState({});
  const [bookingTotal, setBookingTotal] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // Block modal & form state
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isEditingBlock, setIsEditingBlock] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState(null);
  const [blockRoom, setBlockRoom] = useState('');
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockFormError, setBlockFormError] = useState('');

  // Confirm modal state
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState('');
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmCallback, setConfirmCallback] = useState(() => {});

  // Refs
  const guestInputRef = useRef();
  const schedulerWrapperRef = useRef(null);
  
  // ────────────────────────────────────────────────────────────
  // Confirm modal controls (Local UI logic)
  // ────────────────────────────────────────────────────────────
  const showConfirm = (message, callback, title = '') => {
    setConfirmTitle(title);
    setConfirmMessage(message);
    setConfirmCallback(() => callback);
    setConfirmModalVisible(true);
  };
  const handleConfirmYes = () => {
    if(typeof confirmCallback === 'function') {
      confirmCallback();
    }
    setConfirmModalVisible(false);
  };
  const handleConfirmNo = () => {
    setConfirmModalVisible(false);
  };
  
  // ────────────────────────────────────────────────────────────
  // Data Loading (Delegated to services)
  // ────────────────────────────────────────────────────────────
  const loadData = () => {
    if (!selectedHotel) return;
    setIsLoading(true);
    Promise.all([
      apiService.getRooms(selectedHotel),
      apiService.getBookings(selectedHotel),
      apiService.getBlocks(selectedHotel),
    ])
      .then(([roomsResp, bookingsResp, blocksResp]) => {
        const rooms = Array.isArray(roomsResp) ? roomsResp : roomsResp.data || [];
        setRoomTypes([...new Set(rooms.map((r) => r.type))].sort());
        const prices = {};
        rooms.forEach((r) => { prices[r.id] = r.price; });
        setRoomPrices(prices);

        const resourceNameRenderer = (r) => (
          <div
            onClick={(e) => {
                e.stopPropagation();
                if (isMobile) { handleMobileRoomSelect(r); } 
                else { toggleBlockAll(r.id); }
            }}
            title={isMobile ? 'Tap to book this room' : 'Tap to block/unblock all dates'}
            style={{
              cursor: 'pointer', textDecoration: 'underline', display: 'block',
              width: '100%', height: '100%', boxSizing: 'border-box',
              padding: '4px 8px',
              backgroundColor: blockedRoomsAll.includes(r.id) ? 'rgba(255, 0, 0, 0.2)' : undefined,
              color: blockedRoomsAll.includes(r.id) ? 'red' : undefined,
            }}
          >
            {`Room ${r.number} (${r.type})`}
          </div>
        );

        const { resources, events } = schedulerService.loadData(
            rooms, bookingsResp, blocksResp, selectedRoomType, resourceNameRenderer
        );
        
        setResources(resources);
        setEvents(events);
        setSchedulerVersion(v => v + 1); // Force re-render
      })
      .catch((err) => {
        console.error('Load data failed:', err);
        toast.error(`Failed to load data: ${err.message}`);
      })
      .finally(() => setIsLoading(false));
  };
  
  useEffect(() => {
    apiService.getHotels()
      .then((data) => {
        setHotels(data);
        const pick = data.find((h) => h.id === initialHotelId) ? initialHotelId : data.length && data[0].id;
        setSelectedHotel(pick);
      })
      .catch((err) => console.error('Load hotels failed:', err));
    
    apiService.getGuests()
      .then(setGuests)
      .catch((err) => console.error('Load guests failed:', err));
  }, [apiService, initialHotelId]);

  useEffect(() => {
    if (selectedHotel) {
        loadData();
    }
  }, [selectedHotel, selectedRoomType]);

  // --- ADDED: Real-time updates with Socket.IO ---
  useEffect(() => {
    if (!selectedHotel) return;

    const socket = io();
    socket.emit('joinHotel', selectedHotel);
    console.log(`Socket client joined room for hotel: ${selectedHotel}`);

    const handleDataUpdate = () => {
      console.log(`'dataUpdated' event received for hotel ${selectedHotel}. Refreshing...`);
      toast.info('Calendar has been updated by another user.');
      loadData();
    };

    socket.on('dataUpdated', handleDataUpdate);

    return () => {
      console.log(`Socket client leaving room for hotel: ${selectedHotel}`);
      socket.off('dataUpdated', handleDataUpdate);
      socket.disconnect();
    };
  }, [selectedHotel]);

  // ────────────────────────────────────────────────────────────
  // UI Effect Handlers (Local UI logic)
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (guestInputRef.current && !guestInputRef.current.contains(e.target)) {
        setShowGuestSuggestions(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const wrapper = schedulerWrapperRef.current;
    if (!wrapper) return;
    const tables = wrapper.querySelectorAll('table.resource-table');
    if (tables.length === 0) return;
    const resourceTable = tables[tables.length - 1];
    const rows = Array.from(resourceTable.querySelectorAll('tbody tr'));
    rows.forEach((tr, idx) => {
      const cell = tr.querySelector('td');
      const roomId = resources[idx]?.id;
      if (cell) {
        if (blockedRoomsAll.includes(roomId)) {
          cell.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
          cell.style.color = 'red';
        } else {
          cell.style.backgroundColor = '';
          cell.style.color = '';
        }
      }
    });
  }, [resources, blockedRoomsAll]);

  useEffect(() => {
    const nights =
      bookingStart && bookingEnd
        ? moment(bookingEnd).diff(moment(bookingStart), 'days')
        : 0;
    const perNight = parseFloat(bookingPrice) || 0;
    setBookingTotal((perNight * nights).toFixed(2));
  }, [bookingPrice, bookingStart, bookingEnd]);

  // ────────────────────────────────────────────────────────────
  // Mobile Booking Flow Handlers (Local UI logic)
  // ────────────────────────────────────────────────────────────
  const handleMobileRoomSelect = (room) => {
    setMobileBookingRoom(room);
    setMobileCheckin('');
    setMobileCheckout('');
  };

  const handleMobileBookingSubmit = () => {
    if (!mobileBookingRoom || !mobileCheckin || !mobileCheckout) {
      return toast.error('Please select check-in and check-out dates.');
    }
    if (moment(mobileCheckin).isSameOrAfter(moment(mobileCheckout))) {
      return toast.error('Check-out date must be after check-in date.');
    }
    onSelectSlot(
      schedulerService.schedulerData,
      mobileBookingRoom.id,
      null,
      `${mobileCheckin} 00:00:00`,
      mobileCheckout
    );
  };
  
  // ────────────────────────────────────────────────────────────
  // Slot selection & Modal Trigger (Restored to initial logic)
  // ────────────────────────────────────────────────────────────
  const onSelectSlot = (schedulerData, slotId, slotName, start, end) => {
    if (blockedRoomsAll.includes(slotId)) {
      toast.error('This room is fully blocked.');
      return;
    }
    const startDate = moment(start).format('YYYY-MM-DD');
    let endDate = moment(end).format('YYYY-MM-DD');

    if (isBlockMode) {
      const bookingOverlap = events.find((ev) => ev.type === 'booking' && ev.resourceId === slotId && moment(start).isBefore(moment(ev.end)) && moment(end).isAfter(moment(ev.start)));
      if (bookingOverlap) {
        toast.error(`Cannot block: room already booked.`);
        return;
      }
      setBlockRoom(slotId);
      setBlockStart(startDate);
      const inclusiveEndDate = moment(end).subtract(1, 'millisecond').format('YYYY-MM-DD');
      setBlockEnd(inclusiveEndDate);
      setBlockReason('');
      setBlockFormError('');
      setIsEditingBlock(false);
      setEditingBlockId(null);
      setBlockModalVisible(true);
    } else {
      const overlap = events.find((ev) => (ev.type === 'block' || ev.type === 'booking') && ev.resourceId === slotId && moment(start).isBefore(moment(ev.end)) && moment(end).isAfter(moment(ev.start)));
      if (overlap) {
        toast.error(`Cannot book: room is already occupied or blocked.`);
        return;
      }
      
      if (moment(endDate).isSameOrBefore(moment(startDate))) {
        endDate = moment(startDate).add(1, 'days').format('YYYY-MM-DD');
      }

      setSelectedRoom(slotId);
      setBookingStart(startDate);
      setBookingEnd(endDate);
      setBookingPrice(roomPrices[slotId] || '');
      setSelectedGuest('');
      setGuestSearch('');
      setBookingStatus('tentative');
      setBookingFormError('');
      setIsEditingBooking(false);
      setEditingBookingId(null);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBookingModalVisible(true);
      setMobileBookingRoom(null);

      setTimeout(() => {
        const input = guestInputRef.current?.querySelector('input');
        if (input) {
          input.focus();
          setShowGuestSuggestions(true);
        }
      }, 0);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Booking handlers (Delegated to ApiService)
  // ────────────────────────────────────────────────────────────
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingFormError('');
    if (!selectedRoom) return setBookingFormError('Please select a room.');
    if (!selectedGuest) return setBookingFormError('Please select or create a guest.');
    const startISO = `${bookingStart}T12:00:00`;
    const endISO = `${bookingEnd}T11:59:00`;
    if (new Date(startISO) >= new Date(endISO)) {
      return setBookingFormError('Check-out must be after check-in.');
    }
    
    const bookingData = {
        room: selectedRoom,
        guest: selectedGuest,
        startDate: startISO,
        endDate: endISO,
        status: bookingStatus,
        price: bookingPrice,
        totalPrice: bookingTotal,
        notes: bookingNotes,
    };

    try {
      if (isEditingBooking && editingBookingId) {
        await apiService.updateBooking(editingBookingId, bookingData);
        toast.success('Booking updated');
      } else {
        await apiService.createBooking(bookingData);
        toast.success('Booking created');
      }
      closeBookingModal();
      // REMOVED: loadData(); // Relies on socket event now
    } catch (err) {
      console.error('Booking failed:', err);
      setBookingFormError(err.message);
    }
  };

  const handleCancelBooking = async () => {
    if (!editingBookingId) return;
    showConfirm('Cancel this booking?', async () => {
        try {
          await apiService.deleteBooking(editingBookingId);
          closeBookingModal();
          toast.success('Booking cancelled');
          // REMOVED: loadData(); // Relies on socket event now
        } catch (err) {
          console.error('Cancel booking failed:', err);
          toast.error('Failed to cancel booking');
        }
      }, 'Confirm Cancellation'
    );
  };

  const closeBookingModal = () => {
    setBookingModalVisible(false);
    setIsEditingBooking(false);
    setEditingBookingId(null);
    setNewGuestMode(false);
    setEditingGuestMode(false);
    setNewGuestName('');
    setNewGuestEmail('');
    setNewGuestPhone('');
    setNewGuestError('');
    setEditingGuestName('');
    setEditingGuestEmail('');
    setEditingGuestPhone('');
    setEditingGuestError('');
    setBookingFormError('');
    setBookingNotes('');
  };

  // ────────────────────────────────────────────────────────────
  // Block handlers (Delegated to ApiService)
  // ────────────────────────────────────────────────────────────
  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    setBlockFormError('');
    if (!blockRoom) return setBlockFormError('Please select a room.');
    const startISO = `${blockStart}T12:00:00`;
    
    const endMoment = moment(blockEnd).add(1, 'day');
    const endISO = `${endMoment.format('YYYY-MM-DD')}T11:59:00`;

    if (new Date(startISO) >= new Date(endISO)) {
      return setBlockFormError('Block end must be after block start.');
    }

    const blockData = {
        room: blockRoom, startDate: startISO,
        endDate: endISO, reason: blockReason,
    };
    
    try {
      if (isEditingBlock && editingBlockId) {
        await apiService.updateBlock(editingBlockId, blockData);
        toast.success('Block updated');
      } else {
        await apiService.createBlock(blockData);
        toast.success('Room blocked');
      }
      closeBlockModal();
      // REMOVED: loadData(); // Relies on socket event now
    } catch (err) {
      console.error('Block failed:', err);
      setBlockFormError(err.message);
    }
  };

  const handleUnblock = async () => {
    if (!editingBlockId) return;
    showConfirm('Unblock this room?', async () => {
        try {
          await apiService.deleteBlock(editingBlockId);
          closeBlockModal();
          toast.success('Room unblocked');
          // REMOVED: loadData(); // Relies on socket event now
        } catch (err) {
          console.error('Unblock failed:', err);
          toast.error('Failed to unblock room');
        }
      }, 'Confirm Unblock'
    );
  };

  const closeBlockModal = () => {
    setBlockModalVisible(false);
    setIsEditingBlock(false);
    setEditingBlockId(null);
    setBlockReason('');
    setBlockFormError('');
  };

  // ────────────────────────────────────────────────────────────
  // Scheduler Event Handlers (Drag, Resize, Double-click)
  // ────────────────────────────────────────────────────────────
  const onEventMove = (ev, slotId, start, end) => {
    const apiCall = ev.type === 'booking'
      ? apiService.updateBooking(ev.id, { room: slotId, startDate: moment(start).format(), endDate: moment(end).format(), status: ev.status })
      : apiService.updateBlock(ev.id, { room: slotId, startDate: moment(start).format(), endDate: moment(end).format() });

    apiCall
      .then(() => toast.success('Event moved'))
      .catch((err) => {
        toast.error('Failed to move event.');
        loadData(); // Revert on failure
      });
  };

  const onEventResize = (ev, slotId, start, end) => {
    const apiCall = ev.type === 'booking'
      ? apiService.updateBooking(ev.id, { startDate: moment(start).format(), endDate: moment(end).format(), status: ev.status })
      : apiService.updateBlock(ev.id, { startDate: moment(start).format(), endDate: moment(end).format() });

    apiCall
      .then(() => toast.success('Event resized'))
      .catch((err) => {
        toast.error('Failed to resize event.');
        loadData(); // Revert on failure
      });
  };

const eventItemTemplateResolver = (sd, event, start, end, status, style) => {
    let bgColor = event.bgColor;
    const borderWidth = 2;
    const mustBeHeight = 28;
    
    let tooltipText = '';
    if (event.type === 'booking') {
      const checkin = moment(event.start).format('YYYY-MM-DD');
      const checkout = moment(event.end).format('YYYY-MM-DD');
      const numDays = moment(checkout).diff(moment(checkin), 'days');
      const guest = guests.find(g => g.id === event.guestId);
      const guestEmail = guest?.email || 'N/A';
      const guestPhone = guest?.phone || 'N/A';
      const bookingCount = events.filter(e => e.type === 'booking' && e.guestId === event.guestId).length;
      const formattedTotalPrice = event.totalPrice ? Math.round(parseFloat(event.totalPrice)).toLocaleString('id-ID') : 'N/A';

      tooltipText = [
        `Guest: ${event.title}`,
        `Email: ${guestEmail}`,
        `Phone: ${guestPhone}`,
        `Check-In: ${checkin}`,
        `Check-Out: ${checkout}`,
        `Duration: ${numDays} night(s)`,
        `Total Price: ${formattedTotalPrice}`,
        `Status: ${event.status}`,
        `Guest Booking Count: ${bookingCount}`,
        event.notes ? `\nNotes: ${event.notes}` : '',
      ].join('\n');
    } else {
      tooltipText = `Block: ${event.title}\nFrom: ${moment(event.start).format('YYYY-MM-DD')}\nTo: ${moment(event.end).format('YYYY-MM-DD')}`;
    }

    const providedStyle = style || {};

    return (
      <div
        key={event.id}
        title={tooltipText}
        style={{
          position: providedStyle.position,
          top: providedStyle.top,
          left: providedStyle.left,
          width: providedStyle.width,
          height: mustBeHeight,
          borderLeft: `${borderWidth}px solid ${bgColor}`,
          backgroundColor: bgColor,
          padding: '2px',
          cursor: 'pointer',
          color: '#fff',
          boxSizing: 'border-box',
        }}
        onDoubleClick={() => onEventDoubleClick(sd, event)}
      >
        <span style={{ paddingRight: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</span>
        {event.type === 'booking' && (
          <span style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px' }}>
            ✎
          </span>
        )}
      </div>
    );
  };

  const toggleBlockAll = (roomId) => {
    setBlockedRoomsAll((curr) => {
      const isBlocked = curr.includes(roomId);
      const next = isBlocked ? curr.filter((id) => id !== roomId) : [...curr, roomId];
      toast.success(isBlocked ? 'Room unblocked for all dates' : 'Room blocked for all dates');
      return next;
    });
  };

  const onEventDoubleClick = (sd, event) => {
    if (event.type === 'booking') {
      setSelectedRoom(event.resourceId);
      setBookingStart(moment(event.start).format('YYYY-MM-DD'));
      setBookingEnd(moment(event.end).format('YYYY-MM-DD'));
      setBookingPrice(event.price ?? '');
      setBookingStatus(event.status);
      setBookingFormError('');
      setSelectedGuest(event.guestId || '');
      setGuestSearch(event.title || '');
      setShowGuestSuggestions(false);
      setIsEditingBooking(true);
      setEditingBookingId(event.id);
      setNewGuestMode(false);
      setEditingGuestMode(false);
      setBookingNotes(event.notes || '');
      setBookingModalVisible(true);
    } else { // This is a block event
      setBlockRoom(event.resourceId);
      setBlockStart(moment(event.start).format('YYYY-MM-DD'));
      setBlockEnd(moment(event.end).format('YYYY-MM-DD'));
      setBlockReason(event.title === 'Blocked' ? '' : event.title);
      setBlockFormError('');
      setIsEditingBlock(true);
      setEditingBlockId(event.id);
      setBlockModalVisible(true);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Date navigation & view change (Delegated to SchedulerService)
  // ────────────────────────────────────────────────────────────
  const onViewChange = ({ viewType, showAgenda, isEventPerspective }) => {
    schedulerService.setViewType(viewType, showAgenda, isEventPerspective);
    setCurrentView(viewType);
    setSchedulerVersion(v => v + 1);
  };
  const onSelectDate = (date) => {
    schedulerService.setDate(date);
    loadData();
  };
  const onPrev = () => {
    schedulerService.prev();
    loadData();
  };
  const onNext = () => {
    schedulerService.next();
    loadData();
  };

  // ────────────────────────────────────────────────────────────
  // Guest autocomplete & handlers (Delegated to ApiService)
  // ────────────────────────────────────────────────────────────
  const filteredGuests = guests.filter((g) =>
    g.name.toLowerCase().includes(guestSearch.toLowerCase())
  );

  const handleStartEditGuest = () => {
    const guestToEdit = guests.find(g => g.id === selectedGuest);
    if (guestToEdit) {
      setEditingGuestName(guestToEdit.name);
      setEditingGuestEmail(guestToEdit.email || '');
      setEditingGuestPhone(guestToEdit.phone || '');
      setEditingGuestMode(true);
      setShowGuestSuggestions(false);
    }
  };

  const handleAddNewGuest = async () => {
    if (!newGuestName) return setNewGuestError('Name is required');
    setNewGuestError('');
    try {
      const created = await apiService.createGuest({
        name: newGuestName, email: newGuestEmail, phone: newGuestPhone,
      });
      setGuests((prev) => [...prev, created]);
      setSelectedGuest(created.id);
      setGuestSearch(created.name);
      setNewGuestMode(false);
      toast.success('Guest added');
    } catch (err) {
      console.error('Add guest failed:', err);
      setNewGuestError(err.message);
    }
  };

  const handleGuestUpdate = async () => {
    if (!editingGuestName) return setEditingGuestError('Name is required');
    setEditingGuestError('');
    try {
      await apiService.updateGuest(selectedGuest, {
        name: editingGuestName, email: editingGuestEmail, phone: editingGuestPhone,
      });
      const updatedGuests = await apiService.getGuests();
      setGuests(updatedGuests);
      setGuestSearch(editingGuestName);
      setEditingGuestMode(false);
      toast.success('Guest updated');
      if (isEditingBooking) {
        loadData(); 
      }
    } catch (err) {
      console.error('Update guest failed:', err);
      setEditingGuestError(err.message);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 relative pb-28 md:pb-4">
      <ToastContainer position="top-right" autoClose={3000} />
      <h1 className="text-2xl font-bold mb-4">{hotels.find(h => h.id === selectedHotel)?.name || 'Hotel Scheduler'}</h1>

      <SchedulerToolbar
        selectedRoomType={selectedRoomType}
        setSelectedRoomType={setSelectedRoomType}
        roomTypes={roomTypes}
        onPrev={onPrev}
        onNext={onNext}
        currentView={currentView}
        onViewChange={onViewChange}
        isBlockMode={isBlockMode}
        setIsBlockMode={setIsBlockMode}
      />

      {isLoading ? (
        <div className="text-center py-10">Loading Scheduler...</div>
      ) : (
        <div ref={schedulerWrapperRef} style={{ ...CELL_CSS_OVERRIDES, overflowX: 'auto' }}>
          <Scheduler
            key={schedulerVersion}
            schedulerData={schedulerService.schedulerData}
            onViewChange={onViewChange}
            onSelectDate={onSelectDate}
            moveEvent={onEventMove}
            newEvent={onSelectSlot}
            updateEventStart={onEventResize}
            updateEventEnd={onEventResize}
            eventItemTemplateResolver={eventItemTemplateResolver}
            eventItemPopoverEnabled={false}
          />
        </div>
      )}

      <SchedulerLegend />

      <BookingModal
        visible={bookingModalVisible}
        isEditing={isEditingBooking}
        formError={bookingFormError}
        handleSubmit={handleBookingSubmit}
        closeModal={closeBookingModal}
        handleCancelBooking={handleCancelBooking}
        selectedRoom={selectedRoom}
        setSelectedRoom={setSelectedRoom}
        resources={resources}
        guestInputRef={guestInputRef}
        guestSearch={guestSearch}
        setGuestSearch={setGuestSearch}
        showGuestSuggestions={showGuestSuggestions}
        setShowGuestSuggestions={setShowGuestSuggestions}
        selectedGuest={selectedGuest}
        setSelectedGuest={setSelectedGuest}
        setEditingGuestMode={setEditingGuestMode}
        onStartEditGuest={handleStartEditGuest}
        setNewGuestMode={setNewGuestMode}
        filteredGuests={filteredGuests}
        newGuestMode={newGuestMode}
        newGuestName={newGuestName}
        setNewGuestName={setNewGuestName}
        newGuestEmail={newGuestEmail}
        setNewGuestEmail={setNewGuestEmail}
        newGuestPhone={newGuestPhone}
        setNewGuestPhone={setNewGuestPhone}
        handleAddNewGuest={handleAddNewGuest}
        newGuestError={newGuestError}
        editingGuestMode={editingGuestMode}
        editingGuestName={editingGuestName}
        setEditingGuestName={setEditingGuestName}
        editingGuestEmail={editingGuestEmail}
        setEditingGuestEmail={setEditingGuestEmail}
        editingGuestPhone={editingGuestPhone}
        setEditingGuestPhone={setEditingGuestPhone}
        handleGuestUpdate={handleGuestUpdate}
        editingGuestError={editingGuestError}
        bookingPrice={bookingPrice}
        setBookingPrice={setBookingPrice}
        bookingTotal={bookingTotal}
        bookingStart={bookingStart}
        setBookingStart={setBookingStart}
        bookingEnd={bookingEnd}
        setBookingEnd={setBookingEnd}
        bookingStatus={bookingStatus}
        setBookingStatus={setBookingStatus}
        bookingNotes={bookingNotes}
        setBookingNotes={setBookingNotes}
      />

      <BlockModal
        visible={blockModalVisible}
        isEditing={isEditingBlock}
        formError={blockFormError}
        handleSubmit={handleBlockSubmit}
        closeModal={closeBlockModal}
        handleUnblock={handleUnblock}
        blockRoom={blockRoom}
        setBlockRoom={setBlockRoom}
        resources={resources}
        blockReason={blockReason}
        setBlockReason={setBlockReason}
        blockStart={blockStart}
        setBlockStart={setBlockStart}
        blockEnd={blockEnd}
        setBlockEnd={setBlockEnd}
      />

      <MobileBookingBar
        visible={isMobile && !!mobileBookingRoom}
        room={mobileBookingRoom}
        checkin={mobileCheckin}
        setCheckin={setMobileCheckin}
        checkout={mobileCheckout}
        setCheckout={setMobileCheckout}
        onSubmit={handleMobileBookingSubmit}
        onClose={() => setMobileBookingRoom(null)}
      />

      <ConfirmModal
        visible={confirmModalVisible}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={handleConfirmYes}
        onCancel={handleConfirmNo}
      />
    </div>
  );
}

export default DragDropContext(HTML5Backend)(CalendarScheduler);