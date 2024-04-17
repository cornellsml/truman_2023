// ActionProvider starter code
import OpenAI from "openai";
import axios from 'axios';

console.log(process.env.REACT_APP_OPENAI_API_KEY);
const openai = new OpenAI({ apiKey: process.env.REACT_APP_OPENAI_API_KEY, dangerouslyAllowBrowser: true }); // Initialize OpenAI instance

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
        const message = this.createChatBotMessage("Hello!");
        this.setChatbotMessage(message);
    }

    saveChatHandler = async(chatId = "") => {
        console.log("Running saveChatHandler")
        this.stateRef.chatID = chatId;

        const postChat = {
            id: chatId,
            messages: this.stateRef.messages
        }
        await axios.post("http://localhost:3000/chat", postChat, { headers: { 'Content-Type': 'application/json' } });
        console.log("saveChatHandler complete")
    }

    saveAgentResponseHandler = async(chatId = "none") => {
            console.log("Running saveAgentResponseHandler")
            console.log("AGENT LOGS:")
            console.log(this.stateRef.agentLogs)
            // update chatid and format agent response
            this.stateRef.chatID = chatId;
            const postAgentResponse = {
                id: chatId,
                agentResponses: this.stateRef.agentLogs,
            }
            console.log("AGENT Response to post:")
            console.log(postAgentResponse)

            await axios.post("http://localhost:3000/chat-data", postAgentResponse, { headers: { 'Content-Type': 'application/json' } });
            console.log("saveAgentResponseHandler complete")
            //resetting state
            this.resetTrumanState();
            const message2 = this.createChatBotMessage("Let me know if there's anything else I can do for you.");
            this.setChatbotMessage(message2);
    }

    metaGptHandler = async(params) => {
        let postBody = {};
        if (params) {
            postBody = JSON.stringify({
                message: this.stateRef.trumanCodeGenData.message,
                investment: this.stateRef.trumanCodeGenData.investment,
                n_round: this.stateRef.trumanCodeGenData.n_rounds
            })
        }
        let api_response = "";
        await axios.post("http://localhost:5000/code-gen", postBody, { headers: { 'Content-Type': 'application/json' } })
            .then(resp => {
                api_response = resp.data;
                console.log("API RESPONSE:")
                console.log(api_response);
                if (api_response.status == "Fail") {
                    var log = {
                        rounds: this.stateRef.trumanCodeGenData.n_rounds,
                        investment: this.stateRef.trumanCodeGenData.investment,
                        status: api_response.status,
                        human: this.stateRef.trumanCodeGenData.message,
                        engineer: {"Generated Code Snippet": "NA", Location: "NA"},
                        projectManager: {"Implementation Plan": "NA", "Relevant Files": "NA"} 
                    }
                }
                else {
                    var log = {
                        rounds: this.stateRef.trumanCodeGenData.n_rounds,
                        investment: this.stateRef.trumanCodeGenData.investment,
                        status: api_response.status,
                        human: this.stateRef.trumanCodeGenData.message,
                        engineer: api_response.response.Engineer,
                        projectManager: api_response.response.ProjectManager
                    }
                }
                console.log("agentLog")
                console.log(log)
                this.stateRef.agentLogs.push(log)
            }).catch(err => {
                console.log(err);
                const message_err = "Uh Oh! Something went wrong. Please try again later.";
                this.setChatbotMessage(message_err);
            });
        if (api_response.status == "Success") {
            const message_status = this.createChatBotMessage("The following code changes have been made to the Truman Platform!")
            let engineer_string = "Generated code " + "\n`" + api_response.response.Engineer["Generated Code Snippet"] + "`\n in the location " + api_response.response.Engineer["Location"];
            const message_engineer = this.createChatBotMessage(engineer_string);
            this.setChatbotMessage(message_status);
            this.setChatbotMessage(message_engineer); 
        } else {
            const message_status = this.createChatBotMessage("I'm not able to change the code base at this time. Please try again later.");
            this.setChatbotMessage(message_status);
        }
        console.log(api_response.response);
        if (this.stateRef.chatID == null){
            var message2 = this.createChatBotMessage("If you'd like to save this chat history, please provide a chat ID or label. If not, respond \"no\".");
        }
        else {
            var message2 = this.createChatBotMessage("If you'd like to save this chat history, type \"yes\". If not, respond \"no\".");
        }
        this.setChatbotMessage(message2);
    }

    sequenceHandlerTruman = async(prompt, userMessage = "", invest = true, rounds = true) => {
        console.log(this.stateRef);
        if (!prompt) {
            // User specified to use no prompt or example prompt. Run defaults.
            const message = this.createChatBotMessage("Sure, I can help by updating the Truman codebase. This may take a moment.");
            this.setChatbotMessage(message);
            this.metaGptHandler(false);
        } else {
            if (this.stateRef.trumanCodeGenSequence == false) {
                // initial sequence launch, prompt msg
                this.stateRef.trumanCodeGenSequence = true;
                const message = this.createChatBotMessage("Sure, I can help by updating the Truman codebase with your desired changes.")
                this.setChatbotMessage(message);
                const message_2 = this.createChatBotMessage('What would you like me to change?');
                this.setChatbotMessage(message_2);
            } else if (this.stateRef.trumanCodeGenData.message == null) {
                // received msg, prompt investment
                this.stateRef.trumanCodeGenData.message = userMessage;
                const message = this.createChatBotMessage('If you would like to set an investment, please tell me an amount.');
                this.setChatbotMessage(message);
            } else if (this.stateRef.trumanCodeGenData.investment == null) {
                // received investment, prompt rounds
                if (invest) {
                    try {
                        this.stateRef.trumanCodeGenData.investment = parseFloat(userMessage.trim());
                    } catch (error) {
                        const message = this.createChatBotMessage('It seems like the investment value you provided is not a number. Please provide a number.');
                        this.setChatbotMessage(message);
                    }
                } else {
                    this.stateRef.trumanCodeGenData.investment = 20.0;
                }
                const message = this.createChatBotMessage('If you would like to set the number of rounds, please tell me an amount.');
                this.setChatbotMessage(message);
            } else if (this.stateRef.trumanCodeGenData.n_rounds == null & invest == null) {
                // received rounds, run metagpt
                if (rounds) {
                    try {
                        this.stateRef.trumanCodeGenData.n_rounds = parseInt(userMessage.trim())
                    } catch (error) {
                        const message = this.createChatBotMessage('It seems like the number of rounds you provided is not a number. Please provide a number.');
                        this.setChatbotMessage(message);
                    }
                } else {
                    this.stateRef.trumanCodeGenData.n_rounds = 5;
                }
                const message = this.createChatBotMessage('Running your requested changes! This may take a moment.');
                this.setChatbotMessage(message);
                console.log(this.stateRef);
                this.metaGptHandler(true);
            }
        }
    }

    resetTrumanState = () => {
        this.stateRef.trumanCodeGenSequence = false
        this.stateRef.trumanCodeGenData.message = null
        this.stateRef.trumanCodeGenData.investment = null
        this.stateRef.trumanCodeGenData.n_rounds = null
    }

    messageHandlerGpt = async(userInput) => {
        try {
            const completion = await openai.chat.completions.create({
                messages: [{ role: "user", content: userInput }, { role: "system", content: "You are a helpful assistant." }],
                model: "gpt-3.5-turbo",
            });
            const message = this.createChatBotMessage(completion.choices[0].message.content);
            this.setChatbotMessage(message);
        } catch (error) {
            console.error(error);
            const message = this.createChatBotMessage("Uh Oh! Something went wrong. Please try again later.");
            this.setChatbotMessage(message);
        }
    }

    setChatbotMessage = (message) => {
        this.setState(state => ({...this.stateRef, messages: [...state.messages, message] }))
    }
}

export default ActionProvider;


// TODO:
// 1) Make agent "history"
// 2) Include "investments" and "rounds"
// 3) Add "npm run dev" to the package.json
// --- package.json/scripts