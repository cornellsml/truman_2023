const Chat = require('../models/Chat.js');
const User = require('../models/User.js');

/**
 * POST /chat
 * Record chat messages.
 */
exports.postChatMessages = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();

        const filteredMessages = req.body.messages.map(({ message, type }) => ({ message, type }));

        const chatdetail = {
            user: user._id,
            id: req.body.id,
            messages: filteredMessages
        };

        // Check if chat has already been saved in the past. If yes, update messages. If no, create chat object.
        const existingChat = await Chat.findOne({ id: req.body.id }).exec();
        if (existingChat) {
            existingChat.messages = filteredMessages;
            await existingChat.save();
        } else {
            const chat = new Chat(chatdetail);
            await chat.save();
        }
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
}