const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const chatSchema = new mongoose.Schema(
  {
    chat_id: String, // chat id's is defined by who the 2 actors are of the chat: with format [USERNAME_A]-[USERNAME_B] where USERNAME_A and USERNAME_B are alphabetically sorted
    messages: [
      new Schema(
        {
          messageType: {
            type: String,
            required: true,
            enum: ["Actor", "Agent", "User"],
          }, //Indicates whether an actor or user made a comment
          messenger: { type: Schema.ObjectId, refPath: "messages.messageType" }, // Indicates which actor/user made the comment
          body: { type: String, default: "", trim: true }, // Body of the chat message
          absTime: Date, // The absolute date (time) of when the chat message was made
        },
        { _id: true, versionKey: false },
      ),
    ],
  },
  { timestamps: true, versionKey: false },
);

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
