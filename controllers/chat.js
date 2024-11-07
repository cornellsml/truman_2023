const Chat = require("../models/Chat.js");
const { Actor } = require("../models/Actor.js");
const Agent = require("../models/Agent.js");
const User = require("../models/User.js");
const _ = require("lodash");

/**
 * GET /chat
 * Returns the list of messages of chat with chat_id value and the receiver's attributes
 */
exports.getChat = async (req, res, next) => {
  try {
    // Retrieve the chat by ID, populating messenger field in messages
    const chat = await Chat.findOne({ chat_id: req.query.chatFullId })
      .populate("messages.messenger")
      .exec();

    // Sequentially find the actor as an Actor, Agent, or User, setting type accordingly
    let actor, actorType;
    if ((actor = await Actor.findOne({ username: req.query.chatId }).exec())) {
      actorType = "Actor";
    } else if (
      (actor = await Agent.findOne({ username: req.query.chatId }).exec())
    ) {
      actorType = "Agent";
    } else if (
      (actor = await User.findOne({ username: req.query.chatId }).exec())
    ) {
      actorType = "User";
    }

    // If actor or chat is not found, return an empty message array with the actor
    if (!actor) return next(new Error("Actor not found"));

    // Find profile photo of actor
    let picture;
    if (actorType == "User" || actorType == "Agent") {
      if (actor.profile.picture)
        picture = "/user_avatar/" + actor.profile.picture;
      else picture = actor.gravatar(60);
    } else {
      picture = "/profile_pictures/" + actor.profile.picture;
    }
    if (!chat) {
      return res.send({
        messages: [],
        actorType: actorType,
        username: actor.username,
        picture: picture,
        name: actor.profile.name,
      });
    }

    // Map messages to plain JavaScript objects
    const messages = chat.messages.length
      ? chat.messages.map((msg) => msg.toObject())
      : [];

    res.send({
      messages: messages,
      actorType: actorType,
      username: actor.username,
      picture: picture,
      name: actor.profile.name,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

/**
 * POST /chat
 * Add actions with chats.
 */
exports.postChatAction = async (req, res, next) => {
  try {
    let chat = await Chat.findOne({ chat_id: req.body.chatFullId }).exec();
    if (!chat) {
      chat = new Chat({
        chat_id: req.body.chatFullId,
        messages: [],
      });
    }
    // Sequentially find the actor as an Actor, Agent, or User, setting type accordingly
    let actor, actorType;
    if ((actor = await Agent.findOne({ username: req.body.username }).exec())) {
      actorType = "Agent";
    } else if (
      (actor = await User.findOne({ username: req.body.username }).exec())
    ) {
      actorType = "User";
    } else {
      return next(new Error("Actor not found"));
    }

    actor.chatAction.push(chat.id);

    const cat = {
      messageType: actorType,
      messenger: req.user.id,
      body: req.body.body,
      absTime: req.body.absTime,
    };
    chat.messages.push(cat);

    await chat.save();
    await actor.save();
    let returningJson = { result: "success" };
    res.send(returningJson);
  } catch (err) {
    console.log(err);
    next(err);
  }
};
