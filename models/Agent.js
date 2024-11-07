const mongoose = require("mongoose");
const { actorSchema } = require("./Actor");

const agentSchema = new mongoose.Schema(
  {
    // Extend the actor schema
    ...actorSchema.obj,
  },
  { timestamps: true, versionKey: false },
);

/**
 * Helper method for getting user's gravatar.
 */
agentSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash("md5").update(this.email).digest("hex");
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const Agent = mongoose.model("Agent", agentSchema);
module.exports = Agent;
