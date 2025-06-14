// src/client/index.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import CalendarScheduler from './CalendarScheduler';

const DndCalendarScheduler = DragDropContext(HTML5Backend)(CalendarScheduler);

ReactDOM.render(
  <React.StrictMode>
    <DndCalendarScheduler
      // parseInt or Number() turns the string literal into a real number
      initialHotelId={Number(window.__INITIAL_HOTEL_ID__)}
    />
  </React.StrictMode>,
  document.getElementById('root')
);
