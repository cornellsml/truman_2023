// MessageParser starter code
const axios = require('axios');
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
    async queryOpenAI(message) {
        const data = {
            prompt: message,
            max_tokens: 50,
            temperature: 0.5,
        };

        try {
            const response = await axios.post('https://api.openai.com/v4/completions', data, {
                headers: {
                    'Authorization': `Bearer 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`
                }
            });
            return response.data.choices[0].text.trim();
        } catch (error) {
            console.error('Error calling OpenAI:', error);
            return "Sorry, I couldn't process that request.";
        }
    }
  }
  
export default MessageParser;