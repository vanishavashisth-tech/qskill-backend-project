const Event = require("../models/Event");
const Registration = require("../models/Registration");

// @route POST /api/events
// @access Private (any authenticated user can create an event; starts as "pending")
exports.createEvent = async (req, res, next) => {
  try {
    const { title, description, date, time, location, capacity } = req.body;

    if (!title || !description || !date || !time || !location || !capacity) {
      return res.status(400).json({
        success: false,
        message: "title, description, date, time, location and capacity are all required",
      });
    }

    const event = await Event.create({
      title,
      description,
      date,
      time,
      location,
      capacity,
      organizer: req.user._id,
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events
// @access Public
// Supports ?date=YYYY-MM-DD&location=text&page=1&limit=10
// Non-admins only see approved events; admins see everything.
exports.getEvents = async (req, res, next) => {
  try {
    const { date, location, page = 1, limit = 10 } = req.query;
    const query = {};

    if (!(req.user && req.user.role === "admin")) {
      query.status = "approved";
    }

    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      query.date = { $gte: start, $lt: end };
    }

    if (location) {
      query.location = { $regex: location, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [events, total] = await Promise.all([
      Event.find(query)
        .populate("organizer", "name email")
        .sort({ date: 1 })
        .skip(skip)
        .limit(Number(limit)),
      Event.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      events,
    });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events/:id
// @access Public
exports.getEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate("organizer", "name email");

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events/mine
// @access Private
exports.getMyEvents = async (req, res, next) => {
  try {
    const events = await Event.find({ organizer: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: events.length, events });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/events/:id
// @access Private (organizer who owns it, or admin)
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const isOwner = event.organizer.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to update this event" });
    }

    const allowedFields = ["title", "description", "date", "time", "location", "capacity"];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    // Editing an event sends it back for re-approval unless an admin makes the edit
    if (req.user.role !== "admin") {
      event.status = "pending";
    }

    await event.save();

    res.status(200).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/events/:id
// @access Private (organizer who owns it, or admin)
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const isOwner = event.organizer.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to delete this event" });
    }

    await Registration.deleteMany({ event: event._id });
    await event.deleteOne();

    res.status(200).json({ success: true, message: "Event and its registrations were deleted" });
  } catch (err) {
    next(err);
  }
};

// @route PUT /api/events/:id/approve
// @access Private (admin only)
exports.setEventApproval = async (req, res, next) => {
  try {
    const { status } = req.body; // "approved" or "rejected"

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'approved' or 'rejected'" });
    }

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    event.status = status;
    await event.save();

    res.status(200).json({ success: true, event });
  } catch (err) {
    next(err);
  }
};
