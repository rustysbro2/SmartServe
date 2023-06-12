const express = require("express");
const Topgg = require("@top-gg/sdk");
const axios = require("axios");

const app = express(); // Your express app

const webhookAuth = "topggauth123"; // Replace with your actual Top.gg webhook authorization
const apiKey = process.env.API_KEY;
const botId = process.env.BOT_ID;

const webhook = new Topgg.Webhook(webhookAuth); // Initialize the Top.gg webhook

app.post(
  "/webhook",
  webhook.listener((vote) => {
    // Handle webhook vote event
    console.log(vote.user);
  })
); // Attach the webhook listener middleware

app.get("/bot", (req, res) => {
  axios
    .get(`https://top.gg/api/bots/${botId}`, {
      headers: {
        Authorization: apiKey,
      },
    })
    .then((response) => {
      const bot = response.data;
      res.json(bot);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("An error occurred");
    });
});

app.listen(3000); // Your port
