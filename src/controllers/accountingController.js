import AccountingEntry from '../models/AccountingEntry.js';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import Room from '../models/Room.js';
import Hotel from '../models/Hotel.js';
import { validationResult } from 'express-validator';

// Your existing function to get entries
export const getEntries = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { hotelId } = req.params;
        const hotel = await Hotel.findByPk(hotelId);
        const entries = await AccountingEntry.findAll({ where: { hotelId } });
        res.render('admin/hotel_accounting', {
            title: `${hotel.name} - Accounting`,
            hotel,
            entries,
            layout: 'layout'
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// Your existing function to add an entry
export const addEntry = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { hotelId } = req.params;
        const { date, description, type, amount } = req.body;
        await AccountingEntry.create({
            date,
            description,
            type,
            amount,
            hotelId,
        });
        res.redirect(`/admin/hotels/${hotelId}/accounting`);
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// NEW: Add this function to handle rendering the sales report page
export const renderSalesReport = async (req, res, next) => {
    try {
        // The hotelId is now available because we used { mergeParams: true } in the router
        const { hotelId } = req.params; 
        const hotel = await Hotel.findByPk(hotelId);

        if (!hotel) {
            return res.status(404).render('404', { title: 'Not Found' });
        }

        // Fetch completed bookings for the specific hotel
        // and include the related Guest and Room data for display
        const bookings = await Booking.findAll({
            where: {
                hotelId,
                status: 'completed',
            },
            include: [
                { model: Guest, required: true },
                { model: Room, required: true }
            ],
            order: [['startDate', 'DESC']]
        });

        res.render('admin/sales-report', {
            title: `${hotel.name} - Sales Report`,
            hotel,
            bookings,
            layout: 'layout'
        });
    } catch (error) {
        next(error);
    }
};

// Your existing function to update an entry
export const updateEntry = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { id } = req.params;
        const entry = await AccountingEntry.findByPk(id);
        if (!entry) {
            return res.status(404).json({ msg: 'Entry not found' });
        }
        await entry.update(req.body);
        res.json(entry);
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};

// Your existing function to delete an entry
export const deleteEntry = async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    try {
        const { id } = req.params;
        const entry = await AccountingEntry.findByPk(id);
        if (!entry) {
            return res.status(404).json({ msg: 'Entry not found' });
        }
        await entry.destroy();
        res.json({ msg: 'Entry removed' });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
};