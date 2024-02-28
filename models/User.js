const bcrypt = require('@node-rs/bcrypt');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    // passwordResetToken: String,
    // passwordResetExpires: Date,
    username: String,
    active: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },

    endSurveyLink: String,

    numPosts: { type: Number, default: -1 }, //# of user posts
    numComments: { type: Number, default: -1 }, //# of comments on (user and actor) posts, it is used for indexing and commentID of user comments on (user and actor) posts 
    numActorReplies: { type: Number, default: -1 }, //# of actor replies on user posts, it is used for indexing and commentID of actor comments on user posts

    numPostLikes: { type: Number, default: 0 }, //# of actor posts liked
    numCommentLikes: { type: Number, default: 0 }, //# of actor comments liked

    lastNotifyVisit: Date, //Absolute Time; most recent visit to /notifications. First initialization is at account creation.
    createdAt: Date, //Absolute Time user was created
    consent: { type: Boolean, default: false }, //Indicates if user has proceeded through welcome signup pages

    mturkID: { type: String, unique: true },

    experimentalCondition: String, //Experimental condition user is assigned to. Values are defined in the .env file by the variable EXP_CONDITIONS_NAMES.
    // tokens: Array,

    blocked: [String], //list of usernames of actors user has blocked
    reported: [String], //list of usernames of actors user has reported
    followed: [String], //list of usernames of actors user has followed
    blockReportAndFollowLog: [new Schema({
        time: Date, //Absolute Time
        action: String, //values: 'block', 'unblock', 'follow', 'unfollow', 'report'
        report_issue: String, //values: 'interested', 'spam', 'bully', 'hacked'
        actorName: String //username of actor receiving action
    })],

    study_days: { //how many times the user looked at the feed per day
        type: [Number],
        default: Array(parseInt(process.env.NUM_DAYS)).fill(0)
    }, //TODO: Update. It inaccurately +1, whenever creates a new post.

    // User Made posts
    posts: [new Schema({
        type: String, //value: 'user_post'
        postID: Number, //postID for user post (0,1,2,3...)
        body: { type: String, default: '', trim: true }, //body (text) of post
        picture: String, //picture (file path) for post
        liked: { type: Boolean, default: false }, //has the user liked the post?
        likes: { type: Number, default: 0 }, //number of likes on post by actors (excludes user's like)

        //Comments for User Made Posts
        comments: [new Schema({
            actor: { type: Schema.ObjectId, ref: 'Actor' }, //If comment is by Actor
            body: { type: String, default: '', trim: true }, //body (text) of comment
            commentID: Number, //ID of the comment
            relativeTime: Number, //in milliseconds, relative to how much time has passed since the user created their account
            absTime: Date, //Absolute Time; time comment is made
            new_comment: { type: Boolean, default: false }, //is this a comment from user?
            liked: { type: Boolean, default: false }, //has the user liked the comment?
            flagged: { type: Boolean, default: false }, //has the user flagged the comment?
            likes: { type: Number, default: 0 } //number of likes on comment by actors (excludes user's like)
        }, { versionKey: false })],

        absTime: Date, //Absolute Time, exact time post is made
        relativeTime: { type: Number } //in milliseconds, relative to how much time has passed since the user created their account
    })],

    log: [new Schema({ //Logins
        time: Date,
        userAgent: String,
        ipAddress: String
    })],

    pageLog: [new Schema({ //Page visits
        time: Date,
        page: String //URL
    })],

    pageTimes: { //how much time the user spent on the website per day
        type: [Number],
        default: Array(parseInt(process.env.NUM_DAYS)).fill(0)
    },

    postStats: {
        SiteVisits: Number, //Total number of times the user has logged into the website
        GeneralTimeSpent: Number, //Time spent on website
        GeneralPostNumber: Number, //# of posts made by user
        GeneralPostLikes: Number, //# of posts liked
        GeneralCommentLikes: Number, //# of comments liked
        GeneralPostComments: Number, //# of comments left on posts
    },

    feedAction: [new Schema({
        post: { type: Schema.ObjectId, ref: 'Script' },
        postClass: String, //Used for post classification purposes.
        mostRecentTime: Date, //Absolute Time, the most recent Date the post was viewed
        rereadTimes: { type: Number, default: 0 }, //number of times post has been viewed by user.

        liked: { type: Boolean, default: false }, //has the user liked it?
        flagged: { type: Boolean, default: false }, // has the user flagged it?
        likeTime: [Date], //absoluteTimes of times user has liked the post
        unlikeTime: [Date], //absoluteTimes of times user has unliked the post
        flagTime: [Date], //absoluteTimes of times user has flagged the post
        hidden: { type: Boolean, default: false }, //has the user hidden it? Used for Ads only.
        hideTime: [Date], //absoluteTimes of times user has hidden the post
        readTime: [Number], //in milliseconds, how long the user spent looking at the post (we do not record times less than 1.5 seconds and more than 24 hrs)

        comments: [new Schema({
            comment: { type: Schema.ObjectId }, //ID Reference for Script post comment
            liked: { type: Boolean, default: false }, //has the user liked it?
            flagged: { type: Boolean, default: false }, //has the user flagged it?
            likeTime: [Date], //absoluteTimes of times user has liked the 
            unlikeTime: [Date], //absoluteTimes
            flagTime: [Date], //absoluteTimes of times user has flagged the comment
            new_comment: { type: Boolean, default: false }, //is this a comment from user?
            new_comment_id: Number, //ID for comment
            body: String, //Body of comment
            absTime: Date, //Exact time comment was made
            relativeTime: Number, //in milliseconds, relative time comment was made to when the user created their account
            likes: { type: Number, default: 0 }, //number of likes comments has
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

/** Calculate stats: Basic user statistics (not comprehensive) 
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

//Return the user post from its ID
userSchema.methods.getUserPostByID = function(postID) {
    return this.posts.find(x => x.postID == postID);
};

//get user posts within the min/max time period
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