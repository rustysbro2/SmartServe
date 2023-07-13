const { pool } = require("../../database");

let countingChannelId = null;
let count = 0;

async function setCountingChannel(channelId) {
  countingChannelId = channelId;

  // Update the counting channel ID in the database
  try {
    await pool
      .promise()
      .query(
        "INSERT INTO counting_channels (channel_id) VALUES (?) ON DUPLICATE KEY UPDATE channel_id = ?",
        [countingChannelId, countingChannelId],
      );
  } catch (error) {
    console.error("Error updating counting channel ID in the database:", error);
  }

  // Retrieve the count from the database for the counting channel
  try {
    const [rows] = await pool
      .promise()
      .query("SELECT count FROM counting_channels WHERE channel_id = ?", [
        countingChannelId,
      ]);
    if (rows.length > 0) {
      count = rows[0].count;
    } else {
      // If no count is found in the database, insert a new row with the initial count
      await pool
        .promise()
        .query(
          "INSERT INTO counting_channels (channel_id, count) VALUES (?, ?)",
          [countingChannelId, count],
        );
    }
  } catch (error) {
    console.error("Error retrieving count from the database:", error);
  }
}

async function incrementCount() {
  // Check if the counting channel is set
  if (!countingChannelId) {
    throw new Error("Counting channel is not set");
  }

  // Increment the count
  count++;

  // Update the count in the database
  try {
    await pool
      .promise()
      .query("UPDATE counting_channels SET count = ? WHERE channel_id = ?", [
        count,
        countingChannelId,
      ]);
  } catch (error) {
    console.error("Error updating count in the database:", error);
  }
}

function getCount() {
  return count;
}

async function checkCountingChannel(message) {
  const { channel, content, author } = message;

  // Check if the message is sent in the counting channel and not by a bot
  if (channel.id === countingChannelId && !author.bot) {
    const inputNumber = parseInt(content);

    console.log("Input Number:", inputNumber);
    console.log("Current Count:", count);

    // If the user's input is the expected next number, increment the count and acknowledge the user
    if (inputNumber === count) {
      console.log("Correct Number!");
      await incrementCount();
      await message.react("✅");
    } else {
      console.log("Incorrect Number!");
      // If the user's input is incorrect, send an error message
      await channel.send(
        `Oops! That number was incorrect. The next number should be ${count}.`,
      );
    }
  }
}

module.exports = {
  setCountingChannel,
  getCount,
  checkCountingChannel,
};
