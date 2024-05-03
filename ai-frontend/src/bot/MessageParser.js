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
            } 
            else if (lowerMsg.includes("clear") && lowerMsg.includes("chat")) {
                this.actionProvider.clearChat();
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
            // Handle user provided prompt
            this.actionProvider.sequenceHandlerTruman(true, message);
        } else if (this.state.trumanCodeGenData.investment == null) {
            // Handle user provided investment
            if (lowerMsg.includes("no") || lowerMsg.includes("none")) {
                this.actionProvider.sequenceHandlerTruman(true, message, false, null);
            }
            this.actionProvider.sequenceHandlerTruman(true, message, true, null);
        } else if (this.state.trumanCodeGenData.n_rounds == null) {
            
            if (lowerMsg.includes("no") || lowerMsg.includes("none")) {
                this.actionProvider.sequenceHandlerTruman(true, message, null, false);
            }
            this.actionProvider.sequenceHandlerTruman(true, message, null, true);
        } else if (this.state.trumanClarifyData.clarification == null) {
            this.actionProvider.sequenceHandlerTruman(true, message, true, true, lowerMsg)
        }
        else if (this.state.trumanCodeLaunch == null) {
            if (lowerMsg.includes("yes")) {
                this.actionProvider.HandleLaunch(true)
            }
            else {
                this.actionProvider.HandleLaunch(false)
            }
        } else if (this.state.chatID == null) {
            if (!lowerMsg.includes("no")) {
                // log data and messages if yes & chatID given
                this.actionProvider.saveChatHandler(message);
                this.actionProvider.saveAgentResponseHandler(message);
            }
            else {
                // log data if chatid not given
                this.actionProvider.saveAgentResponseHandler("NA");
            }
        }
        else if (this.state.chatID != null & this.state.trumanCodeGenSequence == true) {
            // continue to log data once id given
            if (lowerMsg.includes("rename")) {
                this.actionProvider.removeChatId();
            }
            else {
                if (!lowerMsg.includes("no")) {
                    this.actionProvider.saveChatHandler(this.state.chatID);
                }

                this.actionProvider.saveAgentResponseHandler(this.state.chatID);
            }
        }
    }

    updateChatID(id) {
        // Split the string at the last underscore
        let parts = id.split('_');
        let lastPart = parts.pop(); 
    
        // Check if the last part is a numeric value
        if (!isNaN(lastPart)) {
            // If it's a number, increment it
            let incremented = parseInt(lastPart, 10) + 1;
            return parts.join('_') + '_' + incremented;
        } else {
            // If no underscore was present or last part isn't numeric, add "_2"
            return id + '_2';
        }
    }
}

export default MessageParser;