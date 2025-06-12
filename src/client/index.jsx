// src/client/index.jsx
import React from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import CalendarScheduler from './CalendarScheduler';
import 'react-big-scheduler/lib/css/style.css';

const DndCalendarScheduler = DragDropContext(HTML5Backend)(CalendarScheduler);

ReactDOM.render(
  <React.StrictMode>
    <DndCalendarScheduler />
  </React.StrictMode>,
  document.getElementById('root')
);
