import React from 'react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { library } from "@fortawesome/fontawesome-svg-core";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import './BotAvatar.css'

library.add(faRobot);

const BotAvatar = () => {
    return (
        <div className="avatar"><FontAwesomeIcon icon="fa-solid fa-robot" /></div>
    )
}

export default BotAvatar;