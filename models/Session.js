const bcrypt = require("@node-rs/bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

const sessionSchema = new mongoose.Schema(
  {
    sessionID: String,

    // List of posts made by users in current session
    posts: [{ type: Schema.ObjectId, ref: "Posts" }],
  },
  { timestamps: true, versionKey: false },
);

/**
 * Helper method for getting all User Posts.
 */
sessionSchema.methods.getPosts = function getPosts() {
  let ret = this.posts;
  ret.sort(function (a, b) {
    return b.relativeTime - a.relativeTime;
  });
  for (const post of ret) {
    post.comments.sort(function (a, b) {
      return a.relativeTime - b.relativeTime;
    });
  }
  return ret;
};

// Get user posts within the min/max time period
sessionSchema.methods.getPostInPeriod = function (min, max) {
  return this.posts.filter(function (post) {
    return post.relativeTime >= min && post.relativeTime <= max;
  });
};

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;
