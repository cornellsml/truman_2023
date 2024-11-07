const bcrypt = require("@node-rs/bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });
const { actorSchema } = require("./Actor");

const userSchema = new mongoose.Schema(
  {
    // Extend the actor schema
    ...actorSchema.obj,

    // List of actions made on other's posts
    email: { type: String, unique: true },
    password: String,

    isAdmin: { type: Boolean, default: false }, // Indicates if the user is an administrator

    endSurveyLink: String,

    consent: { type: Boolean, default: false }, // Indicates if user has proceeded through the Welcome & community rule pages

    mturkID: { type: String, unique: true }, // MTurkID
    ResponseID: { type: String, unique: false }, // Qualtric's ResponseID

    experimentalCondition: String, // Indicates the experimental condition user is assigned to. Values are defined in the .env file by the variable EXP_CONDITIONS_NAMES and assigned at account creation in the users controller.

    study_days: {
      // Indicates how many times the user looked at the newsfeed per day
      type: [Number],
      default: Array(parseInt(process.env.NUM_DAYS)).fill(0),
    }, // TODO: Update. It inaccurately +1, whenever creates a new post.

    log: [
      new Schema({
        // List of logins by the user
        time: Date,
        userAgent: String,
        ipAddress: String,
      }),
    ],

    pageLog: [
      new Schema({
        // List of pages the user visits
        time: Date,
        page: String, // URL
      }),
    ],

    pageTimes: {
      // Indicates how much time the user spent on the website per day where index 0 corresponds to the first day, index 1 corresopnds to the second day, etc.
      type: [Number],
      default: Array(parseInt(process.env.NUM_DAYS)).fill(0),
    },

    postStats: {
      // Statistics about the user
      SiteVisits: Number, // Total number of times the user has logged into the website
      GeneralTimeSpent: Number, // Time spent on website
      GeneralPostNumber: Number, // # of posts made by user
      GeneralPostLikes: Number, // # of posts liked
      GeneralCommentLikes: Number, // # of comments liked
      GeneralPostComments: Number, // # of comments left on posts
    },
  },
  { timestamps: true, versionKey: false },
);

/**
 * Password hash middleware.
 */
userSchema.pre("save", async function save(next) {
  const user = this;
  if (!user.isModified("password")) {
    return next();
  }
  try {
    user.password = await bcrypt.hash(user.password, 10);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = async function comparePassword(
  candidatePassword,
  cb,
) {
  try {
    cb(null, await bcrypt.verify(candidatePassword, this.password));
  } catch (err) {
    cb(err);
  }
};

/**
 * Add login instance to user.log
 */
userSchema.methods.logUser = async function logUser(time, agent, ip) {
  try {
    this.log.push({
      time: time,
      userAgent: agent,
      ipAddress: ip,
    });
    await this.save();
  } catch (err) {
    console.log(err);
  }
};

/**
 * Add page visit instance to user.pageLog
 */
userSchema.methods.logPage = async function logPage(time, page) {
  try {
    this.pageLog.push({
      time: time,
      page: page,
    });
    await this.save();
  } catch (err) {
    console.log(err);
  }
};

/**
 * Calculate stats: Basic user statistics (not comprehensive)
 * Also displayed in /completed (Admin Dashboard) for admin accounts.
 */
userSchema.methods.logPostStats = function logPage() {
  const counts = this.feedAction.reduce(
    function (newCount, feedAction) {
      const numLikes = feedAction.comments.filter(
        (comment) => comment.liked && !comment.new_comment,
      ).length;
      const numNewComments = feedAction.comments.filter(
        (comment) => comment.new_comment,
      ).length;
      const counts = this.feedAction.reduce(
        function (newCount, feedAction) {
          const numLikes = feedAction.comments.filter(
            (comment) => comment.liked && !comment.new_comment,
          ).length;
          const numNewComments = feedAction.comments.filter(
            (comment) => comment.new_comment,
          ).length;

          newCount[0] += numLikes;
          newCount[1] += numNewComments;
          return newCount;
        },
        [0, 0], //[actorCommentLikes, newComments]
      );
      newCount[0] += numLikes;
      newCount[1] += numNewComments;
      return newCount;
    },
    [0, 0], //[actorCommentLikes, newComments]
  );

  const log = {
    SiteVisits: this.log.length,
    GeneralTimeSpent: this.pageTimes.reduce(
      (partialSum, a) => partialSum + a,
      0,
    ),
    GeneralPostNumber: this.numPosts + 1,
    GeneralPostLikes: this.feedAction.filter((feedAction) => feedAction.liked)
      .length,
    GeneralCommentLikes: counts[0],
    GeneralPostComments: counts[1],
  };
  this.postStats = log;
};

/**
 * Helper method for getting all User Posts.
 */
userSchema.methods.getPosts = function getPosts() {
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

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function gravatar(size) {
  if (!size) {
    size = 200;
  }
  if (!this.email) {
    return `https://gravatar.com/avatar/?s=${size}&d=retro`;
  }
  const md5 = crypto.createHash("md5").update(this.email).digest("hex");
  return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
