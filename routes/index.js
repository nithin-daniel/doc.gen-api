const express = require("express");
const router = express.Router();

const api = require("./api");
const auth = require("./auth");

router.use("/api/v1", api);
router.use("/auth", auth);
const path = require('path');

router.get("/html", (req, res) => {
  res.sendFile(path.join(__dirname,'..', 'output.html'));
});



router.get("/", (req, res) => {
  res.json({
    status: 200,
    message: "API is working properly",
  });
});

module.exports = router;
