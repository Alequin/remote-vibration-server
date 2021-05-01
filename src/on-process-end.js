const CLOSE_EVENTS = [
  // Source: https://nodejs.org/api/process.html#process_signal_events
  "beforeExit",
  "SIGINT",
  "SIGTERM",
  "SIGHUP",
  "SIGKILL",
  "SIGBUS",
  "SIGFPE",
  "SIGSEGV",
  "SIGILL",

  // Other events not noted in the docs
  "SIGQUIT",
  "SIGTRAP",
  "SIGABRT",
];

const onProcessEnd = (callback) =>
  CLOSE_EVENTS.forEach((eventName) =>
    process.once(eventName, async () => callback(eventName))
  );

module.exports = onProcessEnd;
