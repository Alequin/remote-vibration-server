const parseJsonWithErrorHandling = (message) => {
  try {
    return JSON.parse(message);
  } catch (error) {
    return error;
  }
};

module.exports = parseJsonWithErrorHandling;
