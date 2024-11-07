const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const commentSchema = new mongoose.Schema(
  {
    commentType: {
      type: String,
      required: true,
      enum: ["Actor", "Agent", "User"],
    }, //Indicates whether an actor or user made a comment
    commentor: { type: Schema.ObjectId, refPath: "commentType" }, // Indicates which actor/user made the comment
    post: { type: Schema.ObjectId, ref: "Script" }, // Indicates the post that the comment was made on
    body: { type: String, default: "", trim: true }, // Text(body) of comment
    class: {
      type: String,
      default: "",
      trim: true,
    }, // For experimental use (If blank/null, this comment is shown to all users. If defined, this comment is only shown to users with the same value for their experimental condition)
    commentID: Number, // ID of the comment (0,1,2,3...)
    time: Number, // Indicates when the comment is made on the post relative to how much time has passed since the user created their account, in milliseconds
    absTime: Date, // Absolute Time; Indicates the exact time the comment was made on the post
    actorLikes: { type: Number, default: 0 }, // Indicates the # of likes on the comment by actors
    likes: { type: Number, default: 0 }, // Indicates the total # of likes on the comment
    comments: [{ type: Schema.ObjectId, ref: "Comment" }],
  },
  { timestamps: true, versionKey: false },
);

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
