// ActionProvider starter code

class ActionProvider {
    constructor(
        createChatBotMessage,
        setStateFunc,
        createClientMessage,
        stateRef,
        createCustomMessage,
        ...rest
    ) {
        this.createChatBotMessage = createChatBotMessage;
        this.setState = setStateFunc;
        this.createClientMessage = createClientMessage;
        this.stateRef = stateRef;
        this.createCustomMessage = createCustomMessage;
    }

    messageHandlerHelloWorld = () => {
        const message = this.createChatBotMessage("Hello!")
        this.setChatbotMessage(message)
    }

    messageHandlerGpt = async (userInput) => {
        // Assuming Axios is used for HTTP requests and it's already set up
        const data = {
            prompt: userInput,
            max_tokens: 50,
            temperature: 0.5,
        };

        try {
            const response = await axios.post('https://api.openai.com/v4/completions', data, {
                headers: {
                    'Authorization': `Bearer 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`
                }
            });
            const openAiResponse = response.data.choices[0].text.trim();
            const message = this.createChatBotMessage(openAiResponse);
            this.setChatbotMessage(message);
        } catch (error) {
            console.error('Error calling OpenAI:', error);
            // Handle errors or unsuccessful API calls
            const errorMessage = this.createChatBotMessage("Sorry, I couldn't process that request.");
            this.setChatbotMessage(errorMessage);
        }
    }


    messageHandlerNoGpt = () => {
        const message = this.createChatBotMessage("Hello. Maybe one day I won't use ChatGPT but for now, it's all I got! 😔😔")
        this.setChatbotMessage(message)
    }

    setChatbotMessage = (message) => {
        this.setState(state => ({ ...state, messages: [...state.messages, message]} ))
    }
    }

    export default ActionProvider;
 