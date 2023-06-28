let countingChannelId = null;
let currentCount = 0;

function setCountingChannel(channelId) {
  countingChannelId = channelId;
  currentCount = 0;
}

function checkCounting(channelId, content) {
  if (channelId !== countingChannelId) {
    return false;
  }

  const trimmedContent = content.trim();

  if (!trimmedContent.match(/^\d+$/)) {
    return false;
  }

  const number = parseInt(trimmedContent);

  if (number !== currentCount + 1) {
    return false;
  }

  currentCount = number;
  return true;
}

function getCountingChannelId() {
  return countingChannelId;
}

module.exports = {
  setCountingChannel,
  checkCounting,
  getCountingChannelId,
};
