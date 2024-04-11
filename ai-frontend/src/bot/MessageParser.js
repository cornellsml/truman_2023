// MessageParser starter code
class MessageParser {
    constructor(actionProvider, state) {
        this.actionProvider = actionProvider;
        this.state = state;
    }

    parse(message) {
        console.log("Received message:", message);
        console.log(this.state);
        if (this.state.trumanCodeGenSequence) {
            this.trumanSequenceParse(message);
        } else {
            const lowerMsg = message.toLowerCase();
            // If the user message includes the string "truman" and "no prompt" or "example prompt", then the user wants to run the default MetaGPT test case.
            if (lowerMsg.includes("truman") && (lowerMsg.includes("no prompt") || lowerMsg.includes("example prompt"))) {
                // Launch default truman sequence
                this.actionProvider.sequenceHandlerTruman(false);
            }
            // If the user message includes the string "truman", then the user wants to begin the MetaGPT sequence.
            else if (lowerMsg.includes("truman")) {
                // Launch truman sequence
                this.actionProvider.sequenceHandlerTruman(true);
            }
            // Check for specific commands before sending to GPT
            else if (lowerMsg.includes("hello world")) {
                this.actionProvider.messageHandlerHelloWorld();
            } else {
                // For all other messages, use GPT-3.5 handler
                this.actionProvider.messageHandlerGpt(message);
            }
        }
    }

    trumanSequenceParse(message) {
        const lowerMsg = message.toLowerCase();
        if (this.state.trumanCodeGenData.message == null) {
            // Handle user provided prompt
            this.actionProvider.sequenceHandlerTruman(true, message);
        } else if (this.state.trumanCodeGenData.investment == null) {
            // Handle user provided investment
            if (lowerMsg.includes("no") || lowerMsg.includes("none")) {
                this.actionProvider.sequenceHandlerTruman(true, message, false, null);
            }
            this.actionProvider.sequenceHandlerTruman(true, message, true, null);
        } else if (this.state.trumanCodeGenData.n_rounds == null) {
            // Handle user provided n_round
            if (lowerMsg.includes("no") || lowerMsg.includes("none")) {
                this.actionProvider.sequenceHandlerTruman(true, message, null, false);
            }
            this.actionProvider.sequenceHandlerTruman(true, message, null, true);
        }
    }
}

export default MessageParser;