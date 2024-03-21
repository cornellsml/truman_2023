// MessageParser starter code
class MessageParser {
    constructor(actionProvider, state) {
        this.actionProvider = actionProvider;
        this.state = state;
    }
  
    parse(message) {
        console.log("Received message:", message);
        console.log(this.state)
        if (this.state.trumanCodeGenSequence) {
            this.trumanSequenceParse(message)
        }
        else {
            const lowerMsg = message.toLowerCase();
            if (lowerMsg.includes("truman") && lowerMsg.includes("no prompt")) {
                // launch truman sequence
                this.actionProvider.sequenceHandlerTruman(false);
            }
            else if (lowerMsg.includes("truman")) {
                this.actionProvider.sequenceHandlerTruman(true);
            }
            // Check for specific commands before sending to GPT
            else if (lowerMsg.includes("hello world")) {
                this.actionProvider.messageHandlerHelloWorld();
            } 
            else {
                // For all other messages, use GPT-3.5 handler
                this.actionProvider.messageHandlerGpt(message);
            }
        }
    }
    trumanSequenceParse(message) {
        const lowerMsg = message.toLowerCase();
        if (this.state.trumanCodeGenData.message == null) {
            //prompt message 
            this.actionProvider.sequenceHandlerTruman(true, message);
        }
        else if (this.state.trumanCodeGenData.investment == null) {
            //prompt investment 
            if (lowerMsg.includes("no") || lowerMsg.includes("none")) {
                this.actionProvider.sequenceHandlerTruman(true, message, false, null);
            }
            this.actionProvider.sequenceHandlerTruman(true, message, true, null);
        }
        else if (this.state.trumanCodeGenData.n_round == null) {
            //prompt n_round
            if (lowerMsg.includes("no") || lowerMsg.includes("none")) {
                this.actionProvider.sequenceHandlerTruman(true, message, null, false);
            }
            this.actionProvider.sequenceHandlerTruman(true, message, null, true);
        }
    }
}
  
export default MessageParser;
