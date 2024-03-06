// Config starter code
import React from "react"
import { createChatBotMessage } from "react-chatbot-kit";
import BotAvatar from "../components/BotAvatar"

const botName = "TrumanAI"

const config = {
    botName: botName,
    initialMessages: [
        createChatBotMessage(`Hi, I'm ${botName}`),
        createChatBotMessage('I can help you with reconfiguring your simulation and making the Truman app just right for you!',
        {
            delay: 700,
        })
    ],
    customComponents: {
        botAvatar: (props) => <BotAvatar {...props}/>
    }
}

export default config