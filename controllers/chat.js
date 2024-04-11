const Chat = require('../models/Chat.js');

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
            id: req.boy.id,
            messages: filteredMessages
        };

        const chat = new Chat(chatdetail);
        await chat.save();
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
}