const express = require("express");
const router = express.Router();

const api = require("./api");
const auth = require("./auth");

router.use("/api/v1", api);
router.use("/auth", auth);
const path = require("path");

// router.get("/html", (req, res) => {
//   res.sendFile(path.join(__dirname,'..', 'output.html'));
// });

var S3 = require("aws-sdk/clients/s3");

const s3 = new S3({
  endpoint: process.env.R2_ENDPOINT,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  signatureVersion: "v4",
});

router.get("/", async (req, res) => {
  res.json({
    status: 200,
    message: "API is working properly",
  });
});

module.exports = router;
