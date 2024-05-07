import React from 'react'
import { Chatbot } from 'react-chatbot-kit'
import MessageParser from './bot/MessageParser';
import config from './bot/config';
import ActionProvider from './bot/ActionProvider';
import 'react-chatbot-kit/build/main.css'
import './App.css';

function App() {
  return (
    <div className="App">
      <div style={{}}>
       <Chatbot config={config}
                messageParser={MessageParser}
                actionProvider={ActionProvider}/>
      </div>
    </div>
  );
}

export default App;
