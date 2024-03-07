// ActionProvider starter code
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY,dangerouslyAllowBrowser: true }); // Initialize OpenAI instance

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
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: userInput }, { role: "system", content: "You are a helpful assistant." }],
            model: "gpt-3.5-turbo",
        });

        const message = this.createChatBotMessage(completion.choices[0].message.content);
        this.setChatbotMessage(message);
    }

    messageHandlerNoGpt = () => {
        const message = this.createChatBotMessage("Hello. Maybe one day I won't use ChatGPT but for now, it's all I got! 😔😔")
        this.setChatbotMessage(message)
    }

    setChatbotMessage = (message) => {
        this.setState(state => ({ ...state, messages: [...state.messages, message]} ))
    }

    handleApiFailure = () => {
        // Define a default message for when the API call fails
        const errorMessage = this.createChatBotMessage("I'm sorry, but I'm currently unable to fetch a response. Please try again later.");
        this.setChatbotMessage(errorMessage);
    }
}

export default ActionProvider;

 