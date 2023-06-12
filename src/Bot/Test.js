const express = require("express");
const Topgg = require("@top-gg/sdk");

const app = express(); // Your express app

const webhook = new Topgg.Webhook("topggauth123"); // add your Top.gg webhook authorization (not bot token)

app.post(
  "/dblwebhook",
  webhook.listener((vote) => {
    // vote is your vote object
    console.log(vote.user); // 385324994533654530
  })
); // attach the middleware

app.listen(3000); // your port
