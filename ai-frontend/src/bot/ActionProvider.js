// ActionProvider starter code
import OpenAI from "openai";
import axios from 'axios';

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
    messageHandlerTruman = async () => {
        const message = this.createChatBotMessage("Sure, I can help by updating the code base with your desired changes.")
        this.setChatbotMessage(message)
        let api_response = ""
        console.log("running API")
        await axios.post("http://localhost:5000/code-gen", {})
        .then(resp => {
            api_response = resp.data
            console.log(api_response);
        }).catch(err=> {
            console.log(err);
            const message_err = "Uh Oh somehting went wrong"
            this.setChatbotMessage(message_err)
        });
        if (api_response.status == "Success") {
            const message_status = this.createChatBotMessage("I've successfully made the following code changes to the TrumanAI platform!")
            let engineer_string = "Generated code " + "\n`" + api_response.response.Engineer["Generated Code Snippet"] + "`\n in the location " + api_response.response.Engineer["Location"]
            const message_engineer = this.createChatBotMessage(engineer_string)
            this.setChatbotMessage(message_status)
            this.setChatbotMessage(message_engineer) // we probably don't want to give this info unless it's asked "what did engineer/pm do"
        }
        else {
            const message_status = this.createChatBotMessage("I'm not able to change the code base at this time. Please try again later")
            this.setChatbotMessage(message_status)
        }
        console.log(api_response.response)
        const message2 = this.createChatBotMessage("Let me know if there's anything else I can do for you")
        this.setChatbotMessage(message2)
    }

    messageHandlerGpt = async (userInput) => {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: userInput }, { role: "system", content: "You are a helpful assistant." }],
            model: "gpt-3.5-turbo",
        });

        const message = this.createChatBotMessage(completion.choices[0].message.content);
        this.setChatbotMessage(message);
    }

    setChatbotMessage = (message) => {
        console.log("Message : ", message );
        this.setState(state => ({ ...state, messages: [...state.messages, message]}) )
    }

    handleApiFailure = () => {
        // Define a default message for when the API call fails
        const errorMessage = this.createChatBotMessage("I'm sorry, but I'm currently unable to fetch a response. Please try again later.");
        this.setChatbotMessage(errorMessage);
    }

    //TODO create sequence 
        // User: change code
        // ai: sure what would you like to change
        // User: msg or none
        // ai: sure any specific investment
        // User: number or none
        // ai: Would you like to specify how many rounds?
        // User: number or none
        // ai: (make api request)
    // TODO: add waiting message ... while api loads

}

export default ActionProvider;

 