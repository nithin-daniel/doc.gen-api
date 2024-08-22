const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone_number: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    required: true,
    default: "active",
    enum: ["active", "inactive", "suspended", "deleted"],
  },
  created_at: {
    type: Date,
    required: false,
    default: Date.now,
  },
  updated_at: {
    type: Date,
    required: false,
    default: Date.now,
  },
});

const ReportData = new mongoose.Schema({
  userId: {
    type: String,
  },
  data: {
    type: String,
  },
  created_at: {
    type: Date,
    required: false,
    default: Date.now,
  },
});

const Users = mongoose.model("User", UserSchema);
const Reports = mongoose.model("ReportData", ReportData);

module.exports = { Users, Reports };
