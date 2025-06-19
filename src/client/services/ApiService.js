/**
 * ApiService Class
 * Manages all network requests to the backend API.
 */
export class ApiService {
  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Private helper to perform fetch operations and handle JSON response/errors.
   * @param {string} endpoint - The API endpoint to call.
   * @param {object} opts - Options for the fetch request (method, body, etc.).
   * @returns {Promise<any>} - The JSON response from the server.
   */
  async _fetchJSON(endpoint, opts = {}) {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.msg ||
          (data.errors && data.errors.map((e) => e.msg).join(', ')) ||
          `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      return data;
    } catch (err) {
      console.error(`API call to ${endpoint} failed:`, err);
      throw err; // Re-throw the error to be caught by the calling function
    }
  }

  // --- Hotel & Room Endpoints ---
  getHotels = () => this._fetchJSON('/hotels');
  getRooms = (hotelId) => this._fetchJSON(`/rooms?hotel=${hotelId}`);

  // --- Guest Endpoints ---
  getGuests = () => this._fetchJSON('/guests');
  createGuest = (data) => this._fetchJSON('/guests', { method: 'POST', body: JSON.stringify(data) });
  updateGuest = (id, data) => this._fetchJSON(`/guests/${id}`, { method: 'PUT', body: JSON.stringify(data) });

  // --- Booking Endpoints ---
  getBookings = (hotelId) => this._fetchJSON(`/bookings?hotel=${hotelId}`);
  createBooking = (data) => this._fetchJSON('/bookings', { method: 'POST', body: JSON.stringify(data) });
  updateBooking = (id, data) => this._fetchJSON(`/bookings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteBooking = (id) => this._fetchJSON(`/bookings/${id}`, { method: 'DELETE' });

  // --- Block Endpoints ---
  getBlocks = (hotelId) => this._fetchJSON(`/blocks?hotel=${hotelId}`);
  createBlock = (data) => this._fetchJSON('/blocks', { method: 'POST', body: JSON.stringify(data) });
  updateBlock = (id, data) => this._fetchJSON(`/blocks/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  deleteBlock = (id) => this._fetchJSON(`/blocks/${id}`, { method: 'DELETE' });
}
