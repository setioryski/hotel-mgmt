import React from 'react';

/**
 * Modal for creating or editing a room‐block.
 */
export default function BlockModal({
  visible,
  rooms,
  form,
  handlers,
  onSubmit,
  onCancel,
  onUnblock,
}) {
  if (!visible) return null;

  const {
    isEditing,
    blockRoom,
    blockStart,
    blockEnd,
    blockReason,
    blockFormError,
  } = form;
  const {
    setBlockRoom,
    setBlockStart,
    setBlockEnd,
    setBlockReason,
    setBlockFormError,
  } = handlers;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow w-96 relative">
        <h2 className="text-xl font-semibold mb-4">
          {isEditing ? 'Edit Block' : 'New Block'}
        </h2>
        {blockFormError && (
          <div className="text-red-600 mb-2">{blockFormError}</div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block font-medium">Room:</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={blockRoom}
              onChange={(e) => setBlockRoom(e.target.value)}
            >
              <option value="">— Select Room —</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {`Room ${r.number}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium">Reason (optional):</label>
            <input
              type="text"
              className="w-full border px-2 py-1 rounded"
              placeholder="e.g. Maintenance"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Block Start:</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block font-medium">Block End:</label>
            <input
              type="date"
              className="w-full border px-2 py-1 rounded"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
            />
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded border"
            >
              Cancel
            </button>
            {isEditing ? (
              <button
                type="button"
                onClick={onUnblock}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Unblock
              </button>
            ) : (
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Block
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
