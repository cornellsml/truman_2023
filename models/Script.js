const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const scriptSchema = new mongoose.Schema({
    postID: Number, // ID of the post (0, 1, 2, 3, ... )
    body: { type: String, default: '', trim: true }, // Text (body) of post
    picture: String, // Picture (file path) for post
    likes: Number, // Indicates the number of likes on the post (randomly assigned in populate.js)
    actor: { type: Schema.ObjectId, ref: 'Actor' }, // Actor of post
    time: Number, // Indicates when the post was created relative to how much time has passed since the user created their account, in milliseconds

    class: String, // For experimental use (If blank/null, this post is shown to all users. If defined, this post is shown only to users with the same value for their experimental condition)

    // Sorted by least recent --> most recent
    // List of actor comments on the post
    comments: [new Schema({
        commentID: Number, // ID of the comment (0, 1, 2, 3, ... )
        body: { type: String, default: '', trim: true }, // Text (body) of comment
        likes: Number, // Indicates the number of likes on the comment (randomly assigned in populate.js)
        actor: { type: Schema.ObjectId, ref: 'Actor' }, // Actor of comment
        time: Number, // Indicates when the comment was created relative to how much time has passed since the user created their account, in milliseconds

        class: String, // For experimental use (If blank/null, this comment is shown to all users. If defined, this comment is shown only to users with the same value for their experimental condition)

        new_comment: { type: Boolean, default: false }, // T/F; indicates if the comment is by the user
        liked: { type: Boolean, default: false }, // T/F; indicates if the comment is liked by the user
    }, { versionKey: false })]
}, { versionKey: false });

const Script = mongoose.model('Script', scriptSchema);
module.exports = Script;