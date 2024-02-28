const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const notificationSchema = new mongoose.Schema({
    actor: { type: Schema.ObjectId, ref: 'Actor' }, //actor who did the action (read, like, reply)
    notificationType: String, // 3 types of notifications: 'like', 'read', 'reply'
    time: Number, //in milliseconds, relative to the time of the comment or post

    userPostID: Number, //which user post this action is for (0,1,2....n)
    userReplyID: Number, //which user reply this action is for (0,1,2....n)
    replyBody: { type: String, default: '', trim: true }, //body of actor's reply

    class: String, //For experimental use (if blank/null, post is shown to all users. if defined, post is shown only to user if user.experimentalCondition matches value)
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;