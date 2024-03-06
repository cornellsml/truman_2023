// MessageParser starter code
class MessageParser {
    constructor(actionProvider, state) {
        this.actionProvider = actionProvider;
        this.state = state;
    }
  
    parse(message) {
        // message passed by user
        console.log(message)
        const lowercase = message.toLowerCase()

        if (lowercase.includes("don't send this to chatgpt")) {
            console.log("special prompt")
            this.actionProvider.messageHandlerNoGpt()
        }
        else if (lowercase.includes("hello world")) {
            this.actionProvider.messageHandlerHelloWorld()
        }
    }
  }
  
export default MessageParser;