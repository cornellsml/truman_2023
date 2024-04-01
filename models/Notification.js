const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new mongoose.Schema({
    actor: { type: Schema.ObjectId, ref: 'Actor' }, // Indicates which Actor does the action
    notificationType: String, // 3 types of action/notifications: 'like', 'read', 'reply'
    time: Number, // Indicates when the action occurs relative to the time of the user's comment or post, in milliseconds

    userPostID: Number, // Indicates which user post this action responds to (0,1,2....n)
    userReplyID: Number, // Indicates which user reply this action responds to (0,1,2....n)
    replyBody: { type: String, default: '', trim: true }, // Text(body) of the actor's reply

    class: String, // For experimental use (If blank/null, this notification is shown to all users. If defined, this notification is shown only to users with the same value for their experimental condition)
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;