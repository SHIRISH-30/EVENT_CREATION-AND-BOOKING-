const mongoose = require('mongoose');

const ticketCategorySchema = new mongoose.Schema({
  categoryName: {
    type: String,
    required: true,
  },
  categoryTickets: {
    type: Number,
    required: true,
  },
});

const eventSchema = new mongoose.Schema({
  eventName: {
    type: String,
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  created: {
    type: String,
    required: true,
  },
  eventTime: {
    type: String,
    required: true,
  },
  eventImage: {
    type: String,
  },
  eventLocation: {
    type: String,
    required: true,
  },
  eventDescription: {
    type: String,
    required: true,
  },
  totalTickets: {
    type: Number,
    required: true,
  },
  ticketCategories: [ticketCategorySchema],
  bookedTickets: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      numTickets: {
        type: Number,
        required: true,
      },
      categoryName: {
        type: String,
        required: true,
      },
      phoneNumber: {
        type: String, // Assuming phoneNumber is a String, adjust as needed
        required: true,
      },
    },
  ],
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
