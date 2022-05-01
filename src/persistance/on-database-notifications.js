const onDatabaseNotification = async (callback, listeningClient) => {
  try {
    listeningClient.on("notification", callback);
  } catch (error) {
    logger.error("Unable to watch database for notifications");
    throw error;
  }
};

module.exports = onDatabaseNotification;
