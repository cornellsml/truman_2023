const Script = require("../models/Script.js");
const Comment = require("../models/Comment.js");
const User = require("../models/User");
const helpers = require("./helpers");
const _ = require("lodash");
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

/**
 * GET /
 * Fetch and render newsfeed.
 */
exports.getScript = async (req, res, next) => {
  try {
    const one_day = 86400000; // Number of milliseconds in a day.
    const time_now = Date.now(); // Current date.
    const time_diff = time_now - req.user.createdAt; // Time difference between now and user account creation, in milliseconds.

    const user = await User.findById(req.user.id).exec();

    // If the user is no longer active, sign the user out.
    if (!user.active) {
      req.logout((err) => {
        if (err) console.log("Error : Failed to logout.", err);
        req.session.destroy((err) => {
          if (err)
            console.log(
              "Error : Failed to destroy the session during logout.",
              err,
            );
          req.user = null;
          req.flash("errors", {
            msg: "Account is no longer active. Study is over.",
          });
          res.redirect(
            "/login" + (req.query.r_id ? `?r_id=${req.query.r_id}` : ""),
          );
        });
      });
    }

    // What day in the study is the user in?
    // Update study_days, which tracks the number of time user views feed.
    const current_day = Math.floor(time_diff / one_day);
    if (current_day < process.env.NUM_DAYS) {
      user.study_days[current_day] += 1;
      user.save();
    }

    // Array of actor and other user's posts that match the user's experimental condition, within the past 24 hours, sorted by descending time.
    let script_feed = await Script.find({
      class: { $in: ["", user.experimentalCondition] },
    })
      .populate("poster")
      .populate({
        path: "comments",
        populate: {
          path: "commentor",
        },
      })
      .where("absTime")
      .lte(time_now)
      .sort("-absTime")
      .exec();
    // Get the newsfeed and render it.
    const finalfeed = helpers.getFeed(
      next,
      script_feed,
      user,
      process.env.FEED_ORDER,
      process.env.REMOVE_FLAGGED_CONTENT == "TRUE",
      true,
    );
    console.log("Script Size is now: " + finalfeed.length);
    res.render("script", { script: finalfeed, showNewPostIcon: true });
  } catch (err) {
    next(err);
  }
};

/*
 * Post /post/new
 * Record a new user-made post. Include any actor replies (comments) that go along with it.
 */
exports.newPost = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).exec();
    user.numPosts = user.numPosts + 1; // Count begins at 0
    await user.save();
    const currDate = Date.now();

    let post = {
      postType: "User",
      poster: req.user.id,
      postID: user.numPosts,
      body: req.body.body,
      picture: req.file ? req.file.filename : "",
      actorLikes: 0, // This value will never change.
      absTime: currDate,
      time: currDate - user.createdAt,
      likes: 0,
    };

    //Add new post to Script
    const new_post = new Script(post);
    await new_post.save();

    res.redirect("/");
  } catch (err) {
    console.log(err);
    next(err);
  }
};

/**
 * POST /feed/
 * Record user's actions on ACTOR/other USER's posts.
 */
exports.postUpdateFeedAction = async (req, res, next) => {
  try {
    // TO DO: Current code below assumes that all actions are only by Users, but based on revamping of code, can also be Agents.
    const user = await User.findById(req.user.id)
      .populate("postAction")
      .populate("commentAction")
      .exec();

    // Check if user has interacted with the post before.
    let postIndex = _.findIndex(user.postAction, function (o) {
      return o.post == req.body.postID;
    });

    // Retrieve post from database
    const post = await Script.findById(req.body.postID)
      .populate("poster")
      .populate({
        path: "comments",
        populate: {
          path: "commentor",
        },
      })
      .exec();

    // If the user has not interacted with the post before, add the post to user.feedAction.
    if (postIndex == -1) {
      postIndex = user.postAction.push({ post: post._id }) - 1;
    }

    // User created a new comment on the post.
    if (req.body.new_comment) {
      // Add new comment to comment database
      user.numComments = user.numComments + 1;
      const cat = {
        commentType: "User",
        commentor: req.user.id,
        commentID: user.numComments,
        post: req.body.postID,
        body: req.body.comment_text,
        time: req.body.new_comment - user.createdAt,
        absTime: req.body.new_comment,
        comments: [],
      };
      const new_cmt = new Comment(cat);
      await new_cmt.save();

      // Add reference to comment to post it was made on
      const comment = (
        await Comment.find()
          .where("commentor")
          .equals(req.user.id)
          .where("commentID")
          .equals(user.numComments)
          .exec()
      )[0];

      post.comments.push(comment._id);
      await post.save();
    }
    // User interacted with a comment on the post.
    else if (req.body.commentID) {
      // Find comment
      const comment = await Comment.findById(req.body.commentID)
        .populate("commentor")
        .exec();

      // Check if user has interacted with the comment before.
      let commentIndex = _.findIndex(user.commentAction, function (o) {
        return o.comment == req.body.commentID;
      });

      // If the user has not interacted with the comment before, add the comment to user.commentActions
      if (commentIndex == -1) {
        user.commentAction.push({ comment: req.body.commentID });
        commentIndex = user.commentAction.length - 1;
      }

      // User liked the comment.
      if (req.body.like) {
        const like = req.body.like;
        user.commentAction[commentIndex].likeTime.push(like);
        user.commentAction[commentIndex].liked = true;
        comment.likes++;
        user.numCommentLikes++; // wouldn't need to keep track of this if agent likes post
      }

      // User unliked the comment.
      if (req.body.unlike) {
        const unlike = req.body.unlike;
        user.commentAction[commentIndex].unlikeTime.push(unlike);
        user.commentAction[commentIndex].liked = false;
        comment.likes--;
        user.numCommentLikes--;
      }

      // User flagged the comment.
      else if (req.body.flag) {
        const flag = req.body.flag;
        user.commentAction[commentIndex].flagTime.push(flag);
        user.commentAction[commentIndex].flagged = true;
      }

      // User unflagged the comment.
      else if (req.body.unflag) {
        const unflag = req.body.unflag;
        user.commentAction[commentIndex].unflagTime.push(unflag);
        user.commentAction[commentIndex].flagged = false;
      }

      // User shared the comment.
      else if (req.body.share) {
        const share = req.body.share;
        user.commentAction[commentIndex].shareTime.push(share);
        user.commentAction[commentIndex].shared = true;
      }
      await comment.save();
    }
    // User interacted with the post.
    else {
      // User flagged the post.
      if (req.body.flag) {
        const flag = req.body.flag;
        user.postAction[postIndex].flagTime.push(flag);
        user.postAction[postIndex].flagged = true;
      }

      // User unflagged the post.
      else if (req.body.unflag) {
        const unflag = req.body.unflag;
        user.postAction[postIndex].unflagTime.push(unflag);
        user.postAction[postIndex].flagged = false;
      }

      // User liked the post.
      else if (req.body.like) {
        const like = req.body.like;
        user.postAction[postIndex].likeTime.push(like);
        user.postAction[postIndex].liked = true;
        post.likes++;
        user.numPostLikes++;
      }
      // User unliked the post.
      else if (req.body.unlike) {
        const unlike = req.body.unlike;
        user.postAction[postIndex].unlikeTime.push(unlike);
        user.postAction[postIndex].liked = false;
        post.likes--;
        user.numPostLikes--;
      }
      // User shared the post.
      else if (req.body.share) {
        const share = req.body.share;
        user.postAction[postIndex].shareTime.push(share);
        user.postAction[postIndex].shared = true;
      }
      // User read the post.
      else if (req.body.viewed) {
        const view = req.body.viewed;
        user.postAction[postIndex].readTime.push(view);
        user.postAction[postIndex].rereadTimes++;
        user.postAction[postIndex].mostRecentTime = Date.now();
      } else {
        console.log(
          "Something in feedAction went crazy. You should never see this.",
        );
      }
      await post.save();
    }
    await user.save();
    res.send({ result: "success", numComments: user.numComments });
  } catch (err) {
    next(err);
  }
};
