import { Op } from 'sequelize';
import { getIO } from '../socket.js';
import RoomBlock from '../models/RoomBlock.js';
import Room from '../models/Room.js';

// Create a new block for a room
export const createBlock = async (req, res, next) => {
  try {
    const { room, startDate, endDate, reason } = req.body;

    // Validate room existence
    const roomDoc = await Room.findByPk(room);
    if (!roomDoc) {
      return res.status(404).json({ msg: 'Room not found' });
    }

    // Prevent overlapping blocks
    const overlap = await RoomBlock.findOne({
      where: {
        RoomId: room,
        [Op.or]: [
          { startDate: { [Op.between]: [startDate, endDate] } },
          { endDate: { [Op.between]: [startDate, endDate] } },
          {
            [Op.and]: [
              { startDate: { [Op.lte]: startDate } },
              { endDate: { [Op.gte]: endDate } }
            ]
          }
        ]
      }
    });
    if (overlap) {
      return res.status(400).json({ msg: 'This room is already blocked during the specified period.' });
    }

    // Create the block
    const block = await RoomBlock.create({
      RoomId: room,
      startDate,
      endDate,
      reason: reason || 'Blocked',
    });

    // Emit real-time update to clients in this hotel
    const io = getIO();
    const roomName = `hotel_${roomDoc.HotelId}`;
    io.to(roomName).emit('dataUpdated');
    console.log(`Socket event 'dataUpdated' emitted after block creation to room: ${roomName}`);

    res.status(201).json(block);
  } catch (err) {
    next(err);
  }
};

// Retrieve all blocks, optionally filtered by hotel
export const getBlocks = async (req, res, next) => {
  try {
    const where = {};

    if (req.query.hotel) {
      // Find all room IDs for the given hotel
      const rooms = await Room.findAll({
        where: { HotelId: req.query.hotel },
        attributes: ['id']
      });
      const roomIds = rooms.map(r => r.id);
      where.RoomId = { [Op.in]: roomIds };
    }

    const blocks = await RoomBlock.findAll({ where });

    // Map to scheduler-friendly format
    const result = blocks.map(b => ({
      id: b.id,
      resourceId: b.RoomId,
      title: b.reason || 'Blocked',
      start: b.startDate,
      end: b.endDate,
      bgColor: '#999999' // gray color for blocks
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Delete (unblock) a block by ID
export const deleteBlock = async (req, res, next) => {
  try {
    const block = await RoomBlock.findByPk(req.params.id);
    if (!block) {
      return res.status(404).json({ msg: 'Block not found' });
    }

    // Find hotel via room
    const roomDoc = await Room.findByPk(block.RoomId);
    if (!roomDoc) {
      // Proceed with deletion but cannot emit
      await block.destroy();
      return res.json({ msg: 'Room unblocked.' });
    }

    // Delete the block
    await block.destroy();

    // Emit real-time update to clients in this hotel
    const io = getIO();
    const roomName = `hotel_${roomDoc.HotelId}`;
    io.to(roomName).emit('dataUpdated');
    console.log(`Socket event 'dataUpdated' emitted after block deletion to room: ${roomName}`);

    res.json({ msg: 'Room unblocked.' });
  } catch (err) {
    next(err);
  }
};
