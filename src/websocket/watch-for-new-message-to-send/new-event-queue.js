const { seconds } = require("../../to-milliseconds");

/**
 * Manages database events and when the response to the event is called
 *
 * - The way messages are sent relies on the previous set of message to be delete before the next can be sent
 * - The event queue will manage any new event which fire to allow previous events to finish being processed
 */
const newEventQueue = (eventCallback) => {
  let eventQueue = [];

  const onEvent = async () => {
    // If the queue has 2 events all messages will be picked up and sent eventually. Calling any more will not provide any benefit
    if (eventQueue.length < 2) {
      eventQueue.push(eventCallback);
    }
  };

  const watcher = async () => {
    const queuedEvent = eventQueue.pop();
    if (queuedEvent) await queuedEvent();
    // Delay next check to avoid excess calls
    setTimeout(watcher, seconds(0.5));
  };

  watcher();

  return onEvent;
};

module.exports = newEventQueue;
