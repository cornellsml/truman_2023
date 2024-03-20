// MessageParser starter code
class MessageParser {
    constructor(actionProvider, state) {
        this.actionProvider = actionProvider;
        this.state = state;
    }
  
    parse(message) {
        console.log("Received message:", message);
        const lowercaseMessage = message.toLowerCase();

        // Check for specific commands before sending to GPT
        if (lowercaseMessage.includes("don't send this to chatgpt")) {
            console.log("Special prompt recognized");
            this.actionProvider.messageHandlerNoGpt();
        } else if (lowercaseMessage.includes("hello world")) {
            this.actionProvider.messageHandlerHelloWorld();
        } else {
            // For all other messages, use GPT-3.5 handler
            this.actionProvider.messageHandlerGpt(message);
        }
    }
}
  
export default MessageParser;
