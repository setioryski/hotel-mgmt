// src/client/utils/mappers.js
import React from 'react';
import moment from 'moment';
import { DATE_FORMAT } from 'react-big-scheduler';

export const mapRoomsToResourceList = (roomsResp, selectedRoomType, toggleBlockAll) => {
  const rooms = Array.isArray(roomsResp) ? roomsResp : roomsResp.data || [];
  const filteredRooms = rooms.filter(
    (r) => selectedRoomType === 'all' || r.type === selectedRoomType
  );
  return filteredRooms.map((r) => ({
    id: r.id,
    number: r.number,
    name: (
      <span
        onClick={(e) => {
          e.stopPropagation();
          toggleBlockAll(r.id);
        }}
        style={{ cursor: 'pointer', textDecoration: 'underline' }}
      >{`Room ${r.number} (${r.type})`}</span>
    ),
  }));
};

export const mapBookingsToEvents = (bookingsResp) => {
  const bookings = Array.isArray(bookingsResp) ? bookingsResp : bookingsResp.data || [];
  return bookings.map((e) => {
    let bgColor = '#3B82F6';
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
};

export const mapBlocksToEvents = (blocksResp) => {
  const blocks = Array.isArray(blocksResp) ? blocksResp : blocksResp.data || [];
  return blocks.map((b) => ({
    id: b.id,
    resourceId: b.resourceId,
    title: b.title || 'Blocked',
    start: moment(b.start).format(DATE_FORMAT),
    end: moment(b.end).format(DATE_FORMAT),
    bgColor: '#999999',
    type: 'block',
  }));
};
