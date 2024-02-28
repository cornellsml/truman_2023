const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scriptSchema = new mongoose.Schema({
    postID: Number, //ID of the post (0, 1, 2, 3, ... )
    body: { type: String, default: '', trim: true }, //body (text) of post
    picture: String, //picture (file path) for post
    likes: Number, //number of likes of post (randomly assigned in populate.js)
    actor: { type: Schema.ObjectId, ref: 'Actor' }, //actor of post
    time: Number, //Indicates when the post was created, in milliseconds; relative to how much time has passed since the user created their account.

    class: String, //For experimental use (if blank/null, post is shown to all users. if defined, post is shown only to user if user.experimentalCondition matches value)

    // Sorted by least recent --> most recent
    comments: [new Schema({
        commentID: Number, //ID of the comment (0, 1, 2, 3, ... )
        body: { type: String, default: '', trim: true }, //body (text) of comment
        likes: Number, //number of likes of comment (randomly assigned in populate.js)
        actor: { type: Schema.ObjectId, ref: 'Actor' }, //actor of comment
        time: Number, //Indicates when the comment was created, in milliseconds; relative to how much time has passed since the user created their account.

        class: String, //For experimental use (if blank/null, post is shown to all users. if defined, post is shown only to user if user.experimentalCondition matches value)

        new_comment: { type: Boolean, default: false },
        liked: { type: Boolean, default: false },
    }, { versionKey: false })]
}, { versionKey: false });

const Script = mongoose.model('Script', scriptSchema);
module.exports = Script;