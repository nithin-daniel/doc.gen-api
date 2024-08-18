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
  // console.log(await s3.listBuckets().promise());
  var axios = require("axios").default;
  const fs = require("fs");
  const path = require("path");
  const objectKey = "images/output1.html";
  var options = {
    method: "PUT",
    // url: `https://api.cloudflare.com/client/v4/accounts/${process.env.R2_DOCGEN_ACCOUNT_ID}/r2/buckets/docgen-backend`,
    url: `https://api.cloudflare.com/client/v4/accounts/${
      process.env.R2_DOCGEN_ACCOUNT_ID
    }/r2/buckets/docgen-backend/objects/${encodeURIComponent("output1.html")}`,
    headers: {
      "Content-Type": "application/octet-stream",
      Authorization: "Bearer " + process.env.R2_AUTH_TOKEN,
    },
    data: fs.createReadStream(path.join(__dirname, "../output.html")),
  };

  axios
    .request(options)
    .then(function (response) {
      console.log(response.data.result);
      // Generate the public URL
      const publicUrl = `https://docgen-backend.${
        process.env.R2_DOCGEN_ACCOUNT_ID
      }.r2.cloudflarestorage.com/${encodeURIComponent(objectKey)}`;
      console.log("Public URL:", publicUrl);
    })
    .catch(function (error) {
      console.error(error);
    });
  // const fs = require("fs");
  // const image = fs.readFileSync("./output.html");
  // const blob = new Blob([image]);

  // const formData = new FormData();
  // formData.append("file", blob, "filename_for_cloudflare");

  // try {
  //   const response = await fetch(
  //     `https://api.cloudflare.com/client/v4/accounts/${process.env.R2_DOCGEN_ACCOUNT_ID}/r2/buckets/docgen-backend`,
  //     {
  //       method: "POST",
  //       headers: {
  //         Authorization: `Bearer ${process.env.R2_AUTH_TOKEN}`,
  //       },
  //       body: formData,
  //     }
  //   );
  //   // Your image has been uploaded
  //   // Do something with the response, e.g. save image ID in a database
  //   console.log(await response.json());
  // } catch (error) {
  //   console.error(error);
  // }
  res.json({
    status: 200,
    message: "API is working properly",
  });
});

module.exports = router;
