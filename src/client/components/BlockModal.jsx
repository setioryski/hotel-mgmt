import React from 'react';

const BlockModal = ({
  visible,
  isEditing,
  formError,
  handleSubmit,
  closeModal,
  handleUnblock,
  blockRoom,
  setBlockRoom,
  resources,
  blockReason,
  setBlockReason,
  blockStart,
  setBlockStart,
  blockEnd,
  setBlockEnd,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 md:w-96 relative">
        <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Block' : 'New Block'}</h2>
        {formError && <div className="text-red-600 mb-2">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-medium">Room:</label>
            <select
              className="w-full border px-2 py-1 rounded"
              value={blockRoom}
              onChange={(e) => setBlockRoom(e.target.value)}
            >
              <option value="">— Select Room —</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>{`Room ${r.number}`}</option>
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
          <div className="flex justify-between items-center flex-wrap gap-2 pt-4 border-t">
            <button type="button" onClick={closeModal} className="px-4 py-2 rounded border">Cancel</button>
            {isEditing && (
              <button type="button" onClick={handleUnblock} className="bg-red-600 text-white px-4 py-2 rounded">
                Unblock
              </button>
            )}
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
              {isEditing ? 'Update' : 'Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BlockModal;
