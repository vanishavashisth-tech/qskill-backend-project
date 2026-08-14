const Event = require("../models/Event");
const Registration = require("../models/Registration");

// @route POST /api/events/:id/register
// @access Private
// Uses an atomic conditional update ($lt) so two simultaneous requests can't
// both squeeze into the last open spot (avoids needing a replica-set transaction).
exports.registerForEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    if (event.status !== "approved") {
      return res.status(400).json({ success: false, message: "Event is not open for registration" });
    }

    const existing = await Registration.findOne({ event: event._id, user: req.user._id });
    if (existing && existing.status === "registered") {
      return res.status(400).json({ success: false, message: "You are already registered for this event" });
    }

    // Atomically claim a spot: only succeeds if capacity has not been reached.
    const updatedEvent = await Event.findOneAndUpdate(
      { _id: event._id, $expr: { $lt: ["$registeredCount", "$capacity"] } },
      { $inc: { registeredCount: 1 } },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(400).json({ success: false, message: "Event has reached full capacity" });
    }

    let registration;
    try {
      if (existing) {
        existing.status = "registered";
        registration = await existing.save();
      } else {
        registration = await Registration.create({ event: event._id, user: req.user._id, status: "registered" });
      }
    } catch (innerErr) {
      // Roll back the capacity claim if saving the registration record failed
      await Event.findByIdAndUpdate(event._id, { $inc: { registeredCount: -1 } });
      throw innerErr;
    }

    res.status(201).json({ success: true, registration });
  } catch (err) {
    next(err);
  }
};

// @route DELETE /api/events/:id/register
// @access Private
exports.cancelRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findOne({
      event: req.params.id,
      user: req.user._id,
      status: "registered",
    });

    if (!registration) {
      return res.status(404).json({ success: false, message: "No active registration found for this event" });
    }

    registration.status = "cancelled";
    await registration.save();

    await Event.findByIdAndUpdate(req.params.id, { $inc: { registeredCount: -1 } });

    res.status(200).json({ success: true, message: "Registration cancelled" });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events/mine/registrations
// @access Private
exports.getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ user: req.user._id, status: "registered" })
      .populate("event")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: registrations.length, registrations });
  } catch (err) {
    next(err);
  }
};

// @route GET /api/events/:id/registrations
// @access Private (organizer who owns the event, or admin)
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const isOwner = event.organizer.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view these registrations" });
    }

    const registrations = await Registration.find({ event: event._id, status: "registered" }).populate(
      "user",
      "name email"
    );

    res.status(200).json({ success: true, count: registrations.length, registrations });
  } catch (err) {
    next(err);
  }
};
