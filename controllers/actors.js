const { Actor } = require("../models/Actor.js");
const Script = require("../models/Script.js");
const User = require("../models/User");
const Agent = require("../models/Agent");
const helpers = require("./helpers");
const _ = require("lodash");
const dotenv = require("dotenv");
dotenv.config({ path: ".env" }); // See the file .env.example for the structure of .env

/**
 * GET /actors
 * If the current user is an admin, retrieve all the actors from the database and render them to the page '../views/actors'.
 * If the current user is not an admin, redirect the user to the home page.
 */
exports.getActors = async (req, res, next) => {
  if (!req.user.isAdmin) {
    res.redirect("/");
  } else {
    try {
      const actors = await Actor.find().exec();
      const agents = await Agent.find().exec();
      res.render("actors", { actors, agents });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
};

/**
 * GET /user/:userId
 * Retrieve the profile and relevant experimental posts of the actor whose username field value matches the query parameter value 'userId'.
 * Process the posts with the helper function .getFeed() in ./helpers.js.
 * Check if the current user has blocked or reported the actor.
 * Render the actor's profile page along with the relevant data.
 */
exports.getActor = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).exec();

    // Sequentially find the actor as an Actor, Agent, or User, setting type accordingly
    let actor, actorType;
    if ((actor = await Actor.findOne({ username: req.params.userId }).exec())) {
      actorType = "Actor";
    } else if (
      (actor = await Agent.findOne({ username: req.params.userId }).exec())
    ) {
      actorType = "Agent";
    } else if (
      (actor = await User.findOne({ username: req.params.userId }).exec())
    ) {
      actorType = "User";
    } else {
      return next(new Error("Actor not found"));
    }

    const isBlocked = user.blocked.includes(req.params.userId);
    const isReported = user.reported.includes(req.params.userId);

    const script_feed = await Script.find({
      poster: actor.id,
      class: { $in: ["", user.experimentalCondition] },
      absTime: { $lte: Date.now() },
    })
      .sort("-absTime")
      .populate("poster")
      .populate({ path: "comments", populate: { path: "commentor" } })
      .exec();

    const finalFeed = helpers.getFeed(
      next,
      script_feed,
      user,
      "CHRONOLOGICAL",
      process.env.REMOVE_FLAGGED_CONTENT === "TRUE",
      false,
    );

    res.render("actor", {
      script: finalFeed,
      actor,
      isBlocked,
      isReported,
      title: actor.profile.name,
      actorType,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /user
 * Handle post requests to block, unblock, report, follow, and unfollow an actor.
 */
exports.postBlockReportOrFollow = async (req, res, next) => {
  const currDate = Date.now();
  try {
    const user = await User.findById(req.user.id).exec();
    // Block an actor
    if (req.body.blocked) {
      if (!user.blocked.includes(req.body.blocked)) {
        user.blocked.push(req.body.blocked);
      }
      const log = {
        time: currDate,
        action: "block",
        actorName: req.body.blocked,
      };
      user.blockReportAndFollowLog.push(log);
    }
    // Unblock a user
    else if (req.body.unblocked) {
      if (user.blocked.includes(req.body.unblocked)) {
        const index = user.blocked.indexOf(req.body.unblocked);
        user.blocked.splice(index, 1);
      }
      const log = {
        time: currDate,
        action: "unblock",
        actorName: req.body.unblocked,
      };
      user.blockReportAndFollowLog.push(log);
    }
    // Report an actor
    else if (req.body.reported) {
      if (!user.reported.includes(req.body.reported)) {
        user.reported.push(req.body.reported);
      }
      const log = {
        time: currDate,
        action: "report",
        actorName: req.body.reported,
        report_issue: req.body.report_issue,
      };
      user.blockReportAndFollowLog.push(log);
    }
    // Follow an actor
    else if (req.body.followed) {
      if (!user.followed.includes(req.body.followed)) {
        user.followed.push(req.body.followed);
      }
      const log = {
        time: currDate,
        action: "follow",
        actorName: req.body.followed,
      };
      user.blockReportAndFollowLog.push(log);
    } // Unfollow an actor
    else if (req.body.unfollowed) {
      if (user.followed.includes(req.body.unfollowed)) {
        const index = user.followed.indexOf(req.body.unfollowed);
        user.followed.splice(index, 1);
      }
      const log = {
        time: currDate,
        action: "unfollow",
        actorName: req.body.unfollowed,
      };
      user.blockReportAndFollowLog.push(log);
    }
    await user.save();
    res.send({ result: "success" });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /actors/new
 * Render the new actor form.
 */
exports.getNewActor = async (req, res, next) => {
  if (!req.user.isAdmin) {
    res.redirect("/");
  } else {
    try {
      const actors = await Actor.find().exec();
      res.render("actors/new", { user: req.user });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
};

/**
 * POST /actors/new
 * Create new user with name, gender, age, location, bio, picture, class.
 */
exports.postNewActor = async (req, res) => {
  const { name, gender, age, location, bio, username, actorType } = req.body;
  const picture = req.file ? req.file.filename : null; // Handle file upload (if using multer)

  // Create a new actor based on form data
  const actorDetail = {
    username: name.toLowerCase().replace(/\s+/g, "_"), // Generate a username (e.g. "john_doe")
    profile: {
      name: username,
      gender: gender,
      age: age,
      location: location,
      bio: bio,
      picture: picture,
    },
    class: "user_created_actor", // You can set a default or dynamic class here
  };

  const actor =
    actorType === "Agent" ? new Agent(actorDetail) : new Actor(actorDetail);
  try {
    await actor.save();
  } catch (err) {
    console.log(
      color_error,
      "ERROR: Something went wrong with saving actor in database",
    );
    next(err);
  }

  res.redirect("/actors"); // Redirect to actors page after saving
};
