const express = require('express');
const AgentNotification = require('../models/AgentNotification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const notifications = await AgentNotification.find({ recipientUserId: String(req.user.id) })
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(req.query.limit) || 50, 100))
      .lean();
    return res.json({ success: true, data: notifications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
});

router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const notification = await AgentNotification.findOneAndUpdate(
      { _id: req.params.id, recipientUserId: String(req.user.id) },
      { $set: { readAt: new Date() } },
      { new: true }
    ).lean();
    if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
    return res.json({ success: true, data: notification });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
});

module.exports = router;
