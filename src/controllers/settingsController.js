import InvoiceSetting from '../models/InvoiceSetting.js';
import Hotel from '../models/Hotel.js';

/**
 * Mengambil atau membuat pengaturan invoice untuk sebuah hotel.
 */
export const getInvoiceSettings = async (req, res, next) => {
    try {
        const { hotelId } = req.params;
        
        // Temukan pengaturan yang ada atau buat yang baru jika belum ada
        const [settings, created] = await InvoiceSetting.findOrCreate({
            where: { HotelId: hotelId },
            defaults: {
                HotelId: hotelId,
                address: 'Jl. Jenderal Sudirman No. 1', // Nilai default
                email: 'contact@hotelpms.com',
                phone: '+62 123 4567 890',
                footerQuote: 'Thank you for your business.',
            },
        });

        res.json(settings);
    } catch (error) {
        next(error);
    }
};

/**
 * Memperbarui pengaturan invoice untuk sebuah hotel.
 */
export const updateInvoiceSettings = async (req, res, next) => {
    try {
        const { hotelId } = req.params;
        const { address, email, phone, footerQuote } = req.body;

        const [settings, created] = await InvoiceSetting.findOrCreate({
            where: { HotelId: hotelId },
            defaults: { HotelId: hotelId },
        });

        settings.address = address;
        settings.email = email;
        settings.phone = phone;
        settings.footerQuote = footerQuote;

        await settings.save();

        res.json({ message: 'Settings updated successfully!', settings });
    } catch (error) {
        next(error);
    }
};