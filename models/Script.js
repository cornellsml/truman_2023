const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const scriptSchema = new mongoose.Schema(
  {
    postType: {
      type: String,
      required: true,
      enum: ["Actor", "Agent", "User"],
    }, //Indicates whether an actor, agent, or user made a post
    poster: { type: Schema.ObjectId, refPath: "postType" }, // Indicates which actor/user made the post
    postID: Number, // ID for post (0,1,2,3...)
    class: {
      type: String,
      default: "",
      trim: true,
    }, // For experimental use (If blank/null, this post is shown to all users. If defined, this post is only shown to users with the same value for their experimental condition)
    body: { type: String, default: "", trim: true }, // Text(body) of post
    picture: String, // Picture (file path) for post
    actorLikes: { type: Number, default: 0 }, // Indicates the # of likes on the comment by actors
    likes: { type: Number, default: 0 }, // Indicates the total # of likes on the post
    comments: [{ type: Schema.ObjectId, ref: "Comment" }], // Comments on post
    absTime: Date, // Absolute Time; Indicates the exact time the post was made
    time: { type: Number }, // Indicates when the post was made relative to how much time has passed since the user created their account, in milliseconds
  },
  { versionKey: false },
);

const Script = mongoose.model("Script", scriptSchema);
module.exports = Script;
