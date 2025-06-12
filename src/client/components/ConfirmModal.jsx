// src/client/components/ConfirmModal.jsx
import React from 'react';

const ConfirmModal = ({ visible, title, message, onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-80">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="mb-4">{message}</p>
        <div className="flex justify-end space-x-2">
          <button onClick={onCancel} className="px-4 py-2 rounded border">
            No
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-red-600 text-white">
            Yes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
