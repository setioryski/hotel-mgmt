import React from 'react';
import moment from 'moment';
import { DATE_FORMAT } from 'react-big-scheduler';

/**
 * Turn rooms array into scheduler “resources.”
 */
export function mapResources(rooms, toggleBlockAll) {
  return rooms.map((r) => ({
    id: r.id,
    number: r.number,
    name: (
      <span
        onClick={(e) => {
          e.stopPropagation();
          toggleBlockAll(r.id);
        }}
        style={{ cursor: 'pointer', textDecoration: 'underline' }}
      >
        {`Room ${r.number} (${r.type})`}
      </span>
    ),
  }));
}

/**
 * Merge bookings + blocks into one flat events list.
 */
export function mapEvents(bookings, blocks) {
  const bookingEvents = bookings.map((e) => {
    let bgColor = '#3B82F6'; // booked
    if (e.status === 'tentative') bgColor = '#FBBF24';
    else if (e.status === 'checkedin') bgColor = '#10B981';
    else if (e.status === 'checkedout') bgColor = '#EF4444';
    return {
      id: e.id,
      resourceId: e.resourceId,
      title: e.title,
      start: moment(e.start).format(DATE_FORMAT),
      end: moment(e.end).format(DATE_FORMAT),
      bgColor,
      status: e.status,
      guestId: e.guestId,
      type: 'booking',
    };
  });

  const blockEvents = blocks.map((b) => ({
    id: b.id,
    resourceId: b.resourceId,
    title: b.title || 'Blocked',
    start: moment(b.start).format(DATE_FORMAT),
    end: moment(b.end).format(DATE_FORMAT),
    bgColor: '#999999',
    type: 'block',
  }));

  return [...bookingEvents, ...blockEvents];
}

/**
 * Custom event render template (border + edit icon).
 */
export function eventItemTemplateResolver(
  _schedulerData,
  event,
  _start,
  _end,
  status
) {
  const borderWidth = status === 'start' ? 4 : 1;
  const height = status === 'start' ? 28 : 22;
  return (
    <div
      key={event.id}
      title={
        event.type === 'booking'
          ? `Guest: ${event.title}\nCheck‐In: ${moment(event.start).format(
              'YYYY-MM-DD'
            )}\nCheck‐Out: ${moment(event.end).format(
              'YYYY-MM-DD'
            )}\nStatus: ${event.status}`
          : `Block: ${event.title}\nFrom: ${moment(event.start).format(
              'YYYY-MM-DD'
            )}\nTo: ${moment(event.end).format('YYYY-MM-DD')}`
      }
      style={{
        borderLeft: `${borderWidth}px solid ${event.bgColor}`,
        backgroundColor: event.bgColor,
        height,
        maxWidth: 999,
        padding: '2px',
        position: 'relative',
        cursor: 'pointer',
        color: '#fff',
      }}
    >
      <span style={{ paddingRight: '16px' }}>{event.title}</span>
      {event.type === 'booking' && (
        <span
          style={{
            position: 'absolute',
            right: '4px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '12px',
          }}
        >
          ✎
        </span>
      )}
    </div>
  );
}

/**
 * Custom popover when hovering/clicking an event.
 */
export function eventItemPopoverTemplateResolver(
  _schedulerData,
  event
) {
  return (
    <div className="p-2 bg-white rounded shadow" style={{ minWidth: '200px' }}>
      {event.type === 'booking' ? (
        <>
          <div className="font-semibold mb-1">{event.title}</div>
          <div className="text-sm mb-1">
            <strong>Status:</strong> {event.status}
          </div>
          <div className="text-sm mb-1">
            <strong>Check-In:</strong>{' '}
            {moment(event.start).format('YYYY-MM-DD')}
          </div>
          <div className="text-sm mb-1">
            <strong>Check-Out:</strong>{' '}
            {moment(event.end).format('YYYY-MM-DD')}
          </div>
        </>
      ) : (
        <>
          <div className="font-semibold mb-1">Blocked</div>
          <div className="text-sm mb-1">
            <strong>Reason:</strong> {event.title}
          </div>
          <div className="text-sm mb-1">
            <strong>From:</strong>{' '}
            {moment(event.start).format('YYYY-MM-DD')}
          </div>
          <div className="text-sm mb-1">
            <strong>To:</strong>{' '}
            {moment(event.end).format('YYYY-MM-DD')}
          </div>
        </>
      )}
    </div>
  );
}
