const dotenv = require('dotenv');
dotenv.config({ path: '.env' });

const Script = require('./models/Script.js');
const User = require('./models/User.js');
const Actor = require('./models/Actor.js');
const mongoose = require('mongoose');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Console.log color shortcuts
const color_start = '\x1b[33m%s\x1b[0m'; // yellow
const color_success = '\x1b[32m%s\x1b[0m'; // green
const color_error = '\x1b[31m%s\x1b[0m'; // red

/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI);
db = mongoose.connection;
db.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
    process.exit();
});
console.log(color_success, `Successfully connected to db.`);

/*
  Gets the user models from the database, or folder of json files.
*/
async function getUserJsons() {
    const users = await User
        .find({ isAdmin: false })
        .populate('feedAction.post')
        .exec();
    return users;
}

async function getDataExport() {
    const users = await getUserJsons();
    console.log(color_start, `Starting the data export script...`);
    const currentDate = new Date();
    const outputFilename =
        `truman-dataExport` +
        `.${currentDate.getMonth()+1}-${currentDate.getDate()}-${currentDate.getFullYear()}` +
        `.${currentDate.getHours()}-${currentDate.getMinutes()}-${currentDate.getSeconds()}`;
    const outputFilepath = `./outputFiles/${outputFilename}.csv`;
    const csvWriter_header = [
        { id: 'Id', title: process.env.IDENTIFIER },
        { id: 'Username', title: "Username" },
        { id: 'Condition', title: 'Condition' },
        { id: 'NumUserPostsCreated', title: 'NumUserPostsCreated' },
        { id: 'NumUserCommentsCreated', title: 'NumUserCommentsCreated' },
        { id: 'NumActorPostsLiked', title: 'NumActorPostsLiked' },
        { id: 'NumActorPostsFlagged', title: 'NumActorPostsFlagged' },
        { id: 'NumActorCommentsLiked', title: 'NumActorCommentsLiked' },
        { id: 'NumActorCommentsFlagged', title: 'NumActorCommentsFlagged' },
        { id: 'UserPostsCreated', title: 'UserPostsCreated' },
        { id: 'UserCommentsCreated', title: 'UserCommentsCreated' },
        { id: 'ActorPostsLiked', title: 'ActorPostsLiked' },
        { id: 'ActorPostsFlagged', title: 'ActorPostsFlagged' },
        { id: 'ActorCommentsLiked', title: 'ActorCommentsLiked' },
        { id: 'ActorCommentsFlagged', title: 'ActorCommentsFlagged' },
        { id: 'ActorsBlocked', title: 'ActorsBlocked' },
        { id: 'ActorsReported', title: 'ActorsReported' },
        { id: 'ActorsFollowed', title: 'ActorsFollowed' },
        { id: 'TimeOnSite', title: 'TimeOnSite' },
        { id: 'PageLog', title: 'PageLog' }
    ];
    const csvWriter = createCsvWriter({
        path: outputFilepath,
        header: csvWriter_header
    });
    const records = [];
    // For each user
    for (const user of users) {
        const record = {}; //Record for the user
        record.Id = user.mturkID;
        record.Username = user.username;
        record.Condition = user.group;

        let userPostsCreated = "";
        for (const userPost of user.posts) {
            let string = userPost.body + ", on Day " + (Math.floor(userPost.relativeTime / 86400000) + 1) + "\r\n";
            userPostsCreated += string;
        }
        record.NumUserPostsCreated = user.posts.length;
        record.UserPostsCreated = userPostsCreated;

        let NumActorPostsLiked = 0,
            NumActorPostsFlagged = 0,
            NumUserCommentsCreated = 0,
            NumActorCommentsLiked = 0,
            NumActorCommentsFlagged = 0;
        let ActorPostsLiked = [],
            ActorPostsFlagged = [],
            ActorCommentsLiked = [],
            ActorCommentsFlagged = [];
        let UserCommentsCreated = "";

        //For each post (feedAction)
        for (const feedAction of user.feedAction) {
            if (feedAction.liked) {
                NumActorPostsLiked++;
                ActorPostsLiked.push(feedAction.post.postID);
            }
            if (feedAction.flagged) {
                NumActorPostsFlagged++;
                ActorPostsFlagged.push(feedAction.post.postID);
            }

            const NewComments = feedAction.comments.filter(comment => comment.new_comment);
            NumUserCommentsCreated += NewComments.length;
            for (const newComment of NewComments) {
                let string = newComment.body + ", on Post " + feedAction.post.postID + ", on Day " + (Math.floor(newComment.relativeTime / 86400000) + 1) + "\r\n";
                UserCommentsCreated += string;
            }

            const CommentsLiked_list = feedAction.comments.filter(comment => !comment.new_comment && comment.liked);
            NumActorCommentsLiked += CommentsLiked_list.length;
            for (const likedComment of CommentsLiked_list) {
                ActorCommentsLiked.push(feedAction.post.comments.find(comment => likedComment.comment.equals(comment._id)).commentID);
            }

            const CommentsFlagged_list = feedAction.comments.filter(comment => !comment.new_comment && comment.flagged);
            NumActorCommentsFlagged += CommentsFlagged_list.length;
            for (const flaggedComment of CommentsFlagged_list) {
                ActorCommentsFlagged.push(feedAction.post.comments.find(comment => flaggedComment.comment.equals(comment._id)).commentID);
            }
        }

        record.NumUserCommentsCreated = NumUserCommentsCreated;
        record.NumActorPostsLiked = NumActorPostsLiked;
        record.NumActorPostsFlagged = NumActorPostsFlagged;
        record.NumActorCommentsLiked = NumActorCommentsLiked;
        record.NumActorCommentsFlagged = NumActorCommentsFlagged;
        record.UserCommentsCreated = UserCommentsCreated;
        record.ActorPostsLiked = ActorPostsLiked;
        record.ActorPostsFlagged = ActorPostsFlagged;
        record.ActorCommentsLiked = ActorCommentsLiked;
        record.ActorCommentsFlagged = ActorCommentsFlagged;

        record.ActorsBlocked = user.blocked;
        record.ActorsFollowed = user.followed;

        let actorsReported = "";
        for (const reportedActor of user.reported) {
            const reportLogs = user.blockReportAndFollowLog.filter(log => log.action == 'report' && log.actorName == reportedActor);
            for (const reportReason of reportLogs) {
                actorsReported += reportedActor + ", Reported for " + reportReason.report_issue + "\r\n";
            }
        }
        record.ActorsReported = actorsReported;

        record.TimeOnSite = user.pageTimes.reduce((sum, time) => sum + time);
        record.PageLog = user.pageLog.map(pageLog => pageLog.page);

        console.log(record);
        records.push(record);
    }

    await csvWriter.writeRecords(records);
    console.log(color_success, `...Data export completed.\nFile exported to: ${outputFilepath} with ${records.length} records.`);
    console.log(color_success, `...Finished reading from the db.`);
    db.close();
    console.log(color_start, 'Closed db connection.');
}

getDataExport();