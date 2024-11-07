const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const actorSchema = new mongoose.Schema(
  {
    sessionID: String,

    username: { type: String, unique: true },

    profile: {
      name: { type: String, default: "" },
      location: { type: String, default: "" },
      bio: { type: String, default: "" },
      picture: { type: String, default: "" },
    },

    active: { type: Boolean, default: true }, // Indicates if the user is still active

    numPosts: { type: Number, default: -1 }, // Indicates the # of user posts the user has made. Count begins at 0.
    numComments: { type: Number, default: -1 }, // Indicates the # of comments on (user and actor) posts the user has made. This value is used for indexing and the commentID of user comments on (user and actor) posts. Count begins at 0.

    numPostLikes: { type: Number, default: 0 }, // Indicates the # of posts liked. Count begins at 1.
    numCommentLikes: { type: Number, default: 0 }, // Indicates the # of comments liked. Count begins at 1.

    createdAt: Date, // Absolute Time the user was created

    blocked: [String], // List of usernames of the user has blocked
    reported: [String], // List of usernames of the user has reported
    followed: [String], // List of usernames of the user has followed
    blockReportAndFollowLog: [
      new Schema({
        time: Date, // Absolute Time of action
        action: String, // Action taken. Values include: 'block', 'unblock', 'follow', 'unfollow', 'report'
        report_issue: String, // If action taken is 'report', indicates the reason given. Values include: 'interested', 'spam', 'bully', 'hacked'
        username: String, // Username action relates to
      }),
    ],

    postAction: [
      {
        post: { type: Schema.ObjectId, ref: "Script" },
        liked: { type: Boolean, default: false },
        flagged: { type: Boolean, default: false },
        shared: { type: Boolean, default: false },
        likeTime: [Date], // List of absolute times when the user has liked the post
        unlikeTime: [Date], // List of absolute times when the user has unliked the post
        flagTime: [Date], // List of absolute times when the user has flagged the post
        unflagTime: [Date], // List of absolute times when the user has unflagged the post
        shareTime: [Date], // List of absolute times when the user has shared the post
        mostRecentTime: Date, // Absolute Time, indicates the most recent time the post was viewed
        rereadTimes: { type: Number, default: 0 }, // Indicates the # of times the post has been viewed by user.
      },
    ],

    commentAction: [
      {
        comment: { type: Schema.ObjectId, ref: "Comment" },
        liked: { type: Boolean, default: false }, // Whether the user liked the comment
        flagged: { type: Boolean, default: false }, // Whether the user flagged the comment
        shared: { type: Boolean, default: false },
        likeTime: [Date], // List of absolute times when the user has liked the comment
        unlikeTime: [Date], // List of absolute times when the user has unliked the comment
        flagTime: [Date], // List of absolute times when the user has flagged the comment
        unflagTime: [Date], // List of absolute times when the user has unflagged the comment
        shareTime: [Date], // List of absolute times when the user has shared the comment
      },
    ],

    chatAction: [{ type: Schema.ObjectId, ref: "Chat" }],
  },
  { timestamps: true, versionKey: false },
);

const Actor = mongoose.model("Actor", actorSchema);
module.exports = {
  actorSchema,
  Actor,
};
