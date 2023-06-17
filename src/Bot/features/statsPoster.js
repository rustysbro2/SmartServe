const { client } = require('../bot');
const { AutoPoster } = require('topgg-autoposter');

const topGGToken = process.env.TOPGG_TOKEN;
const botId = process.env.BOT_ID;

const poster = AutoPoster(topGGToken, botId, client);

module.exports = {
  poster,
};
