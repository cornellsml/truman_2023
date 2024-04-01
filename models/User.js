const bcrypt = require('@node-rs/bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    username: String,
    active: { type: Boolean, default: true }, // Indicates if the user is still active
    isAdmin: { type: Boolean, default: false }, // Indicates if the user is an administrator

    endSurveyLink: String,

    numPosts: { type: Number, default: -1 }, // Indicates the # of user posts the user has made. Count begins at 0.
    numComments: { type: Number, default: -1 }, // Indicates the # of comments on (user and actor) posts the user has made. This value is used for indexing and the commentID of user comments on (user and actor) posts. Count begins at 0.
    numActorReplies: { type: Number, default: -1 }, // Indicates the # of actor replies on user posts, it is used for indexing and the commentID of actor comments on user posts. Count begins at 0.

    numPostLikes: { type: Number, default: 0 }, // Indicates the # of actor posts liked. Count begins at 1.
    numCommentLikes: { type: Number, default: 0 }, // Indicates the # of actor comments liked. Count begins at 1.

    lastNotifyVisit: Date, // Absolute Time; Indicates the most recent visit to /notifications. First initialization is at account creation.
    createdAt: Date, // Absolute Time the user was created
    consent: { type: Boolean, default: false }, // Indicates if user has proceeded through the Welcome & community rule pages

    mturkID: { type: String, unique: true }, // MTurkID

    experimentalCondition: String, // Indicates the experimental condition user is assigned to. Values are defined in the .env file by the variable EXP_CONDITIONS_NAMES and assigned at account creation in the users controller.

    blocked: [String], // List of usernames of actors user has blocked
    reported: [String], // List of usernames of actors user has reported
    followed: [String], // List of usernames of actors user has followed
    blockReportAndFollowLog: [new Schema({
        time: Date, // Absolute Time of action
        action: String, // Action taken. Values include: 'block', 'unblock', 'follow', 'unfollow', 'report'
        report_issue: String, // If action taken is 'report', indicates the reason given. Values include: 'interested', 'spam', 'bully', 'hacked'
        actorName: String // Username of actor action relates to
    })],

    study_days: { // Indicates how many times the user looked at the newsfeed per day
        type: [Number],
        default: Array(parseInt(process.env.NUM_DAYS)).fill(0)
    }, // TODO: Update. It inaccurately +1, whenever creates a new post.

    // List of User-made posts
    posts: [new Schema({
        type: String, // Value is always: 'user_post'
        postID: Number, // ID for user post (0,1,2,3...)
        body: { type: String, default: '', trim: true }, // Text(body) of post
        picture: String, // Picture (file path) for post
        liked: { type: Boolean, default: false }, // Indicates if the user has liked the post
        likes: { type: Number, default: 0 }, // Indicates the number of likes on the post by actors (excludes the user's own like)

        // Comments on post
        comments: [new Schema({
            actor: { type: Schema.ObjectId, ref: 'Actor' }, // Indicates which actor made the comment if comment is by an Actor
            body: { type: String, default: '', trim: true }, // Text(body) of comment
            commentID: Number, // ID of the comment
            relativeTime: Number, // Indicates when the comment is made on the post relative to how much time has passed since the user created their account, in milliseconds
            absTime: Date, // Absolute Time; Indicates when the comment is made on the post
            new_comment: { type: Boolean, default: false }, // Indicates if the comment is user-made
            liked: { type: Boolean, default: false }, // Indicates if the user has liked the comment
            flagged: { type: Boolean, default: false }, // Indicates if the user has flagged the comment
            likes: { type: Number, default: 0 } // Indicates the # of likes on the comment by actors (excludes the user's own like)
        }, { versionKey: false })],

        absTime: Date, // Absolute Time; Indicates the exact time the post was made
        relativeTime: { type: Number } // Indicates when the post was made relative to how much time has passed since the user created their account, in milliseconds
    })],

    log: [new Schema({ // List of logins by the user
        time: Date,
        userAgent: String,
        ipAddress: String
    })],

    pageLog: [new Schema({ // List of pages the user visits
        time: Date,
        page: String // URL
    })],

    pageTimes: { // Indicates how much time the user spent on the website per day where index 0 corresponds to the first day, index 1 corresopnds to the second day, etc.
        type: [Number],
        default: Array(parseInt(process.env.NUM_DAYS)).fill(0)
    },

    postStats: { // Statistics about the user
        SiteVisits: Number, // Total number of times the user has logged into the website
        GeneralTimeSpent: Number, // Time spent on website
        GeneralPostNumber: Number, // # of posts made by user
        GeneralPostLikes: Number, // # of posts liked
        GeneralCommentLikes: Number, // # of comments liked
        GeneralPostComments: Number, // # of comments left on posts
    },

    // List of actions made on actor-made posts
    feedAction: [new Schema({
        post: { type: Schema.ObjectId, ref: 'Script' }, // The unique ID for the post within the database, the post the user interacted with
        postClass: String, // Indicates the type of post. Used for post classification purposes.
        mostRecentTime: Date, // Absolute Time, indicates the most recent time the post was viewed
        rereadTimes: { type: Number, default: 0 }, // Indicates the # of times the post has been viewed by user.

        liked: { type: Boolean, default: false }, // Indicates if the user has liked the post
        flagged: { type: Boolean, default: false }, // Indicates if the user has flagged the post
        likeTime: [Date], // List of absolute times when the user has liked the post
        unlikeTime: [Date], // List of absolute times when the user has unliked the post
        flagTime: [Date], // List of absolute times when the user has flagged  the post
        readTime: [Number], // List of durations the user spent looking at the post in milliseconds (we do not record times less than 1.5 seconds and more than 24 hrs)

        comments: [new Schema({
            comment: { type: Schema.ObjectId }, // The unique ID for the comment within the post within the database, the comment the user interacted with
            liked: { type: Boolean, default: false }, // Indicates if the user has liked the comment
            flagged: { type: Boolean, default: false }, // Indicates if the user has flagged the comment
            likeTime: [Date], // List of absolute times when the user has liked the post
            unlikeTime: [Date], // List of absolute times when the user has unliked the post
            flagTime: [Date], // List of absolute times when the user has flagged the post
            new_comment: { type: Boolean, default: false }, // Indicates if this comment is made by the user
            new_comment_id: Number, // ID for the comment if this comment is made by the user
            body: String, // Body (text) of the comment if this comment is made by the user
            absTime: Date, // Exact time comment was made if this comment is made by the user
            relativeTime: Number, // Indicates the time the comment was made relative to when the user created their account, in milliseconds
            likes: { type: Number, default: 0 }, // Indicates the number of likes the comment has
        }, { _id: true, versionKey: false })]
    }, { _id: true, versionKey: false })],

    profile: {
        name: String,
        location: String,
        bio: String,
        picture: String
    }
}, { timestamps: true, versionKey: false });

/**
 * Password hash middleware.
 */
userSchema.pre('save', async function save(next) {
    const user = this;
    if (!user.isModified('password')) { return next(); }
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
userSchema.methods.comparePassword = async function comparePassword(candidatePassword, cb) {
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
            ipAddress: ip
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
            page: page
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
    const counts = this.feedAction.reduce(function(newCount, feedAction) {
            const numLikes = feedAction.comments.filter(comment => comment.liked && !comment.new_comment).length;
            const numNewComments = feedAction.comments.filter(comment => comment.new_comment).length;

            newCount[0] += numLikes;
            newCount[1] += numNewComments;
            return newCount;
        }, [0, 0], //[actorCommentLikes, newComments]
    );

    const log = {
        SiteVisits: this.log.length,
        GeneralTimeSpent: this.pageTimes.reduce((partialSum, a) => partialSum + a, 0),
        GeneralPostNumber: this.numPosts + 1,
        GeneralPostLikes: this.feedAction.filter(feedAction => feedAction.liked).length,
        GeneralCommentLikes: counts[0],
        GeneralPostComments: counts[1]
    }
    this.postStats = log;
};

/**
 * Helper method for getting all User Posts.
 */
userSchema.methods.getPosts = function getPosts() {
    let ret = this.posts;
    ret.sort(function(a, b) {
        return b.relativeTime - a.relativeTime;
    });
    for (const post of ret) {
        post.comments.sort(function(a, b) {
            return a.relativeTime - b.relativeTime;
        });
    }
    return ret;
};

// Return the user post from its ID
userSchema.methods.getUserPostByID = function(postID) {
    return this.posts.find(x => x.postID == postID);
};

// Get user posts within the min/max time period
userSchema.methods.getPostInPeriod = function(min, max) {
    return this.posts.filter(function(post) {
        return post.relativeTime >= min && post.relativeTime <= max;
    });
}

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
    const md5 = crypto.createHash('md5').update(this.email).digest('hex');
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

const User = mongoose.model('User', userSchema);
module.exports = User;