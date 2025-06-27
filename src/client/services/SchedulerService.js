// src/client/services/SchedulerService.js
import moment from 'moment';
import { SchedulerData, ViewTypes, DATE_FORMAT } from 'react-big-scheduler';

export class SchedulerService {
  constructor() {
    this.schedulerData = new SchedulerData(
      moment().format(DATE_FORMAT),  // initial date
      ViewTypes.Month,               // initial view
      false,                         // showAgenda
      false,                         // isEventPerspective
      {
        minuteStep: 30,
        headerEnabled: false,
        eventItemPopoverEnabled: false,

        // ────────────────────────────────
        // FORCE A FIXED ROW HEIGHT
        // ────────────────────────────────
        nonAgendaSlotMinHeight: 48,   // minimum row height in non-agenda (resource) views
        eventItemHeight:       28,    // your custom event height (match your template)
        eventItemLineHeight:   28     // make line-height match
      }
    );
  }

  /**
   * Processes raw data from the API and loads it into the scheduler.
   */
  loadData(rooms, bookings, blocks, selectedRoomType, resourceNameRenderer) {
    const filteredRooms = rooms.filter(
      (r) => selectedRoomType === 'all' || r.type === selectedRoomType
    );

    const resourceList = filteredRooms.map((r) => ({
      id: r.id,
      number: r.number,
      type: r.type,
      name: resourceNameRenderer(r),
    }));

    const bookingEvents = (bookings || []).map((e) => {
        let bgColor = '#3B82F6';
        if (e.status === 'tentative') bgColor = '#FBBF24';
        else if (e.status === 'checkedin') bgColor = '#10B981';
        else if (e.status === 'checkedout') bgColor = '#EF4444';
        return {
            id: e.id, resourceId: e.resourceId, title: e.title,
            start: moment(e.start).format(DATE_FORMAT),
            end: moment(e.end).format(DATE_FORMAT),
            bgColor, status: e.status, guestId: e.guestId,
            price: e.price, totalPrice: e.totalPrice, type: 'booking',
            notes: e.notes, // ADDED: Pass notes to event object
        };
    });

    const blockEvents = (blocks || []).map((b) => ({
        id: b.id, resourceId: b.resourceId, title: b.title || 'Blocked',
        start: moment(b.start).format(DATE_FORMAT),
        end: moment(b.end).format(DATE_FORMAT),
        bgColor: '#999999', type: 'block',
    }));

    this.schedulerData.setResources(resourceList);
    this.schedulerData.setEvents([...bookingEvents, ...blockEvents]);

    return {
      resources: resourceList,
      events: [...bookingEvents, ...blockEvents],
    };
  }

  // --- Scheduler View Controls ---
  setViewType = (viewType, showAgenda, isEventPerspective) => {
    this.schedulerData.setViewType(viewType, showAgenda, isEventPerspective);
  };

  setDate = (date) => this.schedulerData.setDate(date);
  prev = () => this.schedulerData.prev();
  next = () => this.schedulerData.next();
}