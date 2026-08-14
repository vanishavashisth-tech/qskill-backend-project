const express = require("express");
const router = express.Router();
const {
  createEvent,
  getEvents,
  getEvent,
  getMyEvents,
  updateEvent,
  deleteEvent,
  setEventApproval,
} = require("../controllers/eventController");
const {
  registerForEvent,
  cancelRegistration,
  getMyRegistrations,
  getEventRegistrations,
} = require("../controllers/registrationController");
const { protect, authorize } = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Optionally attach req.user if a valid token is present, without requiring one.
// Lets getEvents show pending events to admins while staying public for everyone else.
// Unlike protect(), a missing or invalid token here just means "anonymous", not a 401.
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) return next();

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (user) req.user = user;
    next();
  } catch (err) {
    next();
  }
};

// Specific/static paths before "/:id" routes so they aren't swallowed as an id param
router.get("/mine", protect, getMyEvents);
router.get("/mine/registrations", protect, getMyRegistrations);

router.route("/").get(optionalAuth, getEvents).post(protect, createEvent);

router
  .route("/:id")
  .get(getEvent)
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

router.put("/:id/approve", protect, authorize("admin"), setEventApproval);

router.post("/:id/register", protect, registerForEvent);
router.delete("/:id/register", protect, cancelRegistration);
router.get("/:id/registrations", protect, getEventRegistrations);

module.exports = router;
