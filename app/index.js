const installBridgeShims = () => {
  try {
    const messageQueueModule = require('react-native/Libraries/BatchedBridge/MessageQueue');
    const MessageQueue = messageQueueModule?.default || messageQueueModule;

    if (MessageQueue) {
      global.MessageQueue = global.MessageQueue || MessageQueue;
      globalThis.MessageQueue = globalThis.MessageQueue || MessageQueue;
    }
  } catch (error) {
    if (__DEV__) {
      console.log('MessageQueue shim skipped', error);
    }
  }
};

installBridgeShims();
require('expo-router/entry');
