let count = 0;

function incrementCount() {
  count++;
}

function getCount() {
  return count;
}

module.exports = {
  incrementCount,
  getCount
};
