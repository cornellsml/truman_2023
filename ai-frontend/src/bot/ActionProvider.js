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

    messageHandlerGpt = () => {
        //TODO: API CALL TO CHATGPT
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
 