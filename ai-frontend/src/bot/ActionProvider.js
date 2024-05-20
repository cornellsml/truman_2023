// ActionProvider starter code
import OpenAI from "openai";
import axios from 'axios';
import ReactLoading from "react-loading";

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
            if (this.stateRef.chatID == "NA") {
                this.stateRef.chatID = null
            }
            this.resetTrumanState();
            const message2 = this.createChatBotMessage("Let me know if there's anything else I can do for you.", {delay: 700});
            this.setChatbotMessage(message2);
    }

    metaGptExecHandler = async(params) => {
        console.log("BEGIN LOADING SYMBOL")
        const loading = this.createChatBotMessage(
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1vh', backgroundColor: 'white', paddingTop: '40px', margin: "-10px" }}>

            <ReactLoading type="spin" color="black"
        height={80} width={40}/>
        
        </div>
    );
        this.setState((prev) => ({ ...prev, messages: [...prev.messages, loading], }))

        console.log("STATE GOING INTO METAGPT")
        console.log(this.stateRef)

        let postBody = {};
        if (params) {
            postBody = JSON.stringify({
                projectManager: this.stateRef.trumanClarifyData.clarifyTxt,
                clarification: this.stateRef.trumanClarifyData.clarification,
                investment: this.stateRef.trumanCodeGenData.investment,
                n_round: this.stateRef.trumanCodeGenData.n_rounds
            })
        }
        
        let api_response = "";
        await axios.post("http://localhost:5000/develop", postBody, { headers: { 'Content-Type': 'application/json' } })
            .then(resp => {
                api_response = resp.data;
                console.log("API RESPONSE:")
                console.log(api_response);
                if (api_response.status == "Success") {
                    var log = this.stateRef.agentLogs.pop();
                    log["engineer"] = api_response.response
                    this.stateRef.trumanCodeGenData.develop_response = api_response["raw-response"]
                    console.log("agentLog")
                    console.log(log)
                    this.stateRef.agentLogs.push(log)
                }
            }).catch(err => {
                console.log(err);
            });

        this.setState((prev) => {
            const newPrevMsg = prev.messages.slice(0, -1)
            return { ...prev, messages: [...newPrevMsg], }
        })

        if (api_response.status == "Success") {
            const message_status = this.createChatBotMessage("The following code changes have been made to the Truman Platform!", {delay: 700})
            this.setChatbotMessage(message_status);
            for (let i = 0; i < api_response.response.length; i++) {
                let code_str = String((i+1)) + ") " + "Generated code " + "\n`" + api_response.response[i]["Code"] + "`\n in the location " + api_response.response[i]["FileName"]
                let code_html = <div>${i+1}) Generated code <br/><code>${api_response.response[i]["Code"]}</code><br/> in the location ${api_response.response[i]["FileName"]}</div>
                let code_msg = this.createChatBotMessage(code_html, {delay: 700});
                console.log("Message " + i + ") " + code_str)
                this.setChatbotMessage(code_msg);
            }
        } else {
            const message_status = this.createChatBotMessage("I'm not able to change the code base at this time. Please try again later.");
            this.setChatbotMessage(message_status);
        }
        if (this.stateRef.trumanCodeLaunch == null && api_response.status == "Success") {
            const message = this.createChatBotMessage("Would you like to implement these changes to the Truman App?")
            this.setChatbotMessage(message)
        }
        else {
            this.HandleLaunch(false)
        }
    }

    metaGptQueryHandler = async(params) => {

        console.log("BEGIN LOADING SYMBOL")
        const loading = this.createChatBotMessage(
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1vh', backgroundColor: 'white', paddingTop: '40px', margin: "-10px" }}>

            <ReactLoading type="spin" color="black"
        height={80} width={40}/>
        
        </div>
    );
        this.setState((prev) => ({ ...prev, messages: [...prev.messages, loading], }))


        let postBody = {};
        if (params) {
            postBody = JSON.stringify({
                message: this.stateRef.trumanCodeGenData.message,
                investment: this.stateRef.trumanCodeGenData.investment,
                n_round: this.stateRef.trumanCodeGenData.n_rounds
            })
        }
        
        let api_response = "";
        await axios.post("http://localhost:5000/analyze", postBody, { headers: { 'Content-Type': 'application/json' } })
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
                        engineer: {"FileName": "NA", "Code": "NA", "Before": "NA", "After": "NA"},
                        projectManager: {"Clarifications Needed": "NA", "Detailed Specification": "NA", "General Requirement": "NA",  "Type of Change": "NA"} 
                    }
                }
                else {
                    var log = {
                        rounds: this.stateRef.trumanCodeGenData.n_rounds,
                        investment: this.stateRef.trumanCodeGenData.investment,
                        status: api_response.status,
                        human: this.stateRef.trumanCodeGenData.message,
                        engineer: "",
                        projectManager: api_response.response.ProjectManager
                    }
                }
                this.stateRef.trumanClarifyData.clarifyTxt = api_response.response_str
                console.log("STATE REF:")
                console.log(this.stateRef)
                console.log(this.stateRef.trumanClarifyData.clarifyTxt)

                console.log("agentLog")
                console.log(log)
                this.stateRef.agentLogs.push(log)
            }).catch(err => {
                console.log(err);
            });

        this.setState((prev) => {
            const newPrevMsg = prev.messages.slice(0, -1)
            return { ...prev, messages: [...newPrevMsg], }
        })

        if (api_response.status == "Success") {
            const message_status = this.createChatBotMessage("I will need some clarification to the following", {delay: 700})
            this.setChatbotMessage(message_status);

            for (let i = 0; i < api_response.response.ProjectManager["Clarifications Needed"].length; i++) {
                let clarify_string = String((i+1)) + ") " + api_response.response.ProjectManager["Clarifications Needed"][i]
                let chatbot_msg = this.createChatBotMessage(clarify_string, {delay: 700});
                this.setChatbotMessage(chatbot_msg);
            }

        } else {
            const message_status = this.createChatBotMessage("I'm not able to change the code base at this time. Please try again later.");
            this.setChatbotMessage(message_status);
        }
    }

    metaGptHandler = async(params) => {

    
        console.log("BEGIN LOADING SYMBOL")
        const loading = this.createChatBotMessage(
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1vh', backgroundColor: 'white', paddingTop: '40px', margin: "-10px" }}>

            <ReactLoading type="spin" color="black"
        height={80} width={40}/>
        
        </div>
    );
        this.setState((prev) => ({ ...prev, messages: [...prev.messages, loading], }))


        let postBody = {};
        if (params) {
            postBody = JSON.stringify({
                message: this.stateRef.trumanCodeGenData.message,
                investment: this.stateRef.trumanCodeGenData.investment,
                n_round: this.stateRef.trumanCodeGenData.n_rounds
            })
        }
        let api_response = "";
        await axios.post("http://localhost:5000/analyze", postBody, { headers: { 'Content-Type': 'application/json' } })
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
            });

        this.setState((prev) => {
            const newPrevMsg = prev.messages.slice(0, -1)
            return { ...prev, messages: [...newPrevMsg], }
        })

        if (api_response.status == "Success") {
            const message_status = this.createChatBotMessage("The following code changes have been made to the Truman Platform!", {delay: 700})
            let engineer_string = "Generated code " + "\n`" + api_response.response.Engineer["Generated Code Snippet"] + "`\n in the location " + api_response.response.Engineer["Location"];
            let engineer_html = <p>
            Generated code 
            <span style="font-family: monospace; color: lightgrey;">
              ${api_response.response.Engineer["Generated Code Snippet"]}
            </span>
            in the location ${api_response.response.Engineer["Location"]}
          </p>
            const message_engineer = this.createChatBotMessage(engineer_html, {delay: 700});
            this.setChatbotMessage(message_status);
            this.setChatbotMessage(message_engineer); 
        } else {
            const message_status = this.createChatBotMessage("I'm not able to change the code base at this time. Please try again later.");
            this.setChatbotMessage(message_status);
        }
        if (this.stateRef.trumanCodeLaunch == null && api_response.status == "Success") {
            const message = this.createChatBotMessage("Would you like to implement these changes to the Truman App?")
            this.setChatbotMessage(message)
        }
        else {
            this.HandleLaunch(false)
        }
    }

    sequenceHandlerTruman = async(prompt, userMessage = "", invest = true, rounds = true, clarif = "") => {
        console.log(this.stateRef);
        if (!prompt) {
            // User specified to use no prompt or example prompt. Run defaults.
            const message = this.createChatBotMessage("Sure, I can help by updating the Truman codebase. This may take a moment.", {delay: 700});
            this.setChatbotMessage(message);
        } else {
            if (this.stateRef.trumanCodeGenSequence == false) {
                // initial sequence launch, prompt msg
                this.stateRef.trumanCodeGenSequence = true;
                const message = this.createChatBotMessage("Sure, I can help by updating the Truman codebase with your desired changes.", {delay: 700})
                this.setChatbotMessage(message);
                const message_2 = this.createChatBotMessage('What would you like me to change?', {delay: 700});
                this.setChatbotMessage(message_2);
            } else if (this.stateRef.trumanCodeGenData.message == null) {
                // received msg, prompt investment
                this.stateRef.trumanCodeGenData.message = userMessage;
                const message = this.createChatBotMessage('If you would like to set an investment, please tell me an amount.', {delay: 700});
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
                const message = this.createChatBotMessage('If you would like to set the number of rounds, please tell me an amount.', {delay: 700});
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

                const message = this.createChatBotMessage('Analyzing your requested changes! This may take a moment.');
                this.setChatbotMessage(message);
                console.log(this.stateRef);
                this.metaGptQueryHandler(true);
            }
            else if (clarif) {
                this.stateRef.trumanClarifyData.clarification = clarif
                console.log("CLARIFICATION")
                console.log(this.stateRef.trumanClarifyData.clarification)
                const msg1 = this.createChatBotMessage('Okay, got it');
                this.setChatbotMessage(msg1);
                const msg2 = this.createChatBotMessage('Developing your requested changes! This may take a moment.')
                this.setChatbotMessage(msg2);
                this.metaGptExecHandler(true)
            }
        }
    }

    //Still needs to be implemented on the backend side
    HandleLaunch = async(launch) => {
        console.log("in launch", launch)
        this.stateRef.trumanCodeLaunch = launch
        let API_FAIL = null
        if (launch == true) {
            const message = this.createChatBotMessage("Okay! Running changes", {delay: 700});
            this.setChatbotMessage(message)

            const loading = this.createChatBotMessage(
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '1vh', backgroundColor: 'white', paddingTop: '40px', margin: "-10px" }}>
                    <ReactLoading type="spin" color="black" height={80} width={40}/>
                </div>
            );
            this.setState((prev) => ({ ...prev, messages: [...prev.messages, loading], }))
            
            let api_response = "";
            const postBody = JSON.stringify({
                develop_output: this.stateRef.trumanCodeGenData.develop_response
            })

        await axios.post("http://localhost:5000/code-implement", postBody, { headers: { 'Content-Type': 'application/json' } })
            .then(resp => {
                api_response = resp.data;
                console.log("API RESPONSE 2:")
                console.log(api_response);
            }).catch(err => {
                API_FAIL = true
                this.setState((prev) => {
                    const newPrevMsg = prev.messages.slice(0, -1)
                    return { ...prev, messages: [...newPrevMsg], }
                })
                console.log(err);
                const message_err = "Uh Oh! Something went wrong. Please try again later.";
            });

            if (API_FAIL != true & api_response.status == "success") {
                this.setState((prev) => {
                    const newPrevMsg = prev.messages.slice(0, -1)
                    return { ...prev, messages: [...newPrevMsg], }
                })
                const paths = api_response.response
                console.log("PATHS: ")
                console.log(paths)
                const message2 = this.createChatBotMessage("Done! The updates can be found in the following files: ", {delay: 700});
                this.setChatbotMessage(message2)
                //print paths here

                for (let i = 0; i < paths.length; i++) {
                    console.log("Message " + i + ") " + paths[i])
                    let code_html = <div><code>${paths[i]}</code></div>
                    let code_msg = this.createChatBotMessage(code_html, {delay: 700});
                    this.setChatbotMessage(code_msg);
                }

            }
        }


        if (this.stateRef.chatID == null){
            var message2 = this.createChatBotMessage("If you'd like to save this chat history, please provide a chat ID or label. If not, respond \"no\".", {delay: 700});
        }
        else {
            var message2 = this.createChatBotMessage("If you'd like to save the chat history of " + this.stateRef.chatID + ", type \"yes\". If not, respond \"no\" or \"rename\" to save under a new chat ID", {delay: 700});
        }
        this.setChatbotMessage(message2);
    }

    resetTrumanState = () => {
        this.stateRef.trumanCodeGenSequence = false
        this.stateRef.trumanCodeGenData.message = null
        this.stateRef.trumanCodeGenData.investment = null
        this.stateRef.trumanCodeGenData.n_rounds = null
        this.stateRef.trumanCodeGenData.develop_response = null
        this.stateRef.trumanCodeLaunch = null
        this.stateRef.trumanClarifyData.clarification = null
        this.stateRef.trumanClarifyData.clarifyTxt = null
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

    removeChatId = () => {
        this.stateRef.chatID = null
        const message = this.createChatBotMessage("Please provide a chat ID or label", {delay: 700});
        this.setChatbotMessage(message);
    }   
    clearChat = () => {
        const message = this.createChatBotMessage("Okay, clearing chat!");
        this.setChatbotMessage(message);
        const message2 = this.createChatBotMessage(" ",{delay: 700});
        this.setChatbotMessage(message2);
        this.setState((prev) => {
            return { ...prev, messages: [
                this.createChatBotMessage(`Hi, I'm TrumanAI`),
                this.createChatBotMessage('I can help you with reconfiguring your simulation and making the Truman app just right for you!', 
                    {delay: 700}
                )]}
            })
    }
}

export default ActionProvider;