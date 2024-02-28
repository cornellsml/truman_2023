const _ = require('lodash');

// From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffle(array) {
    let currentIndex = array.length,
        randomIndex;
    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]
        ];
    }
    return array;
}

/**
 * Helper function, called in .getNotifications (notifications controller), .getScript (script controller), .getActor (actor controller)
 * Takes in user and actor post objects, outputs a final feed with objects reflecting recorded user action and behavior
 * Arguments: 
 *  - user_posts: list of user posts, from user.posts
 *  - script_feed: list of script (actor) posts, from Script.find(...)
 *  - user: User document
 *  - order: 'SHUFFLE', 'CHRONOLOGICAL', 'NOTIFICATION'; indicates order final feed should be returned in.
 *  - removedFlaggedContent (boolean): T/F, indicates if flagged content should be removed from the final feed.
 * Returns: 
 *  - finalfeed: the final feed
 */

exports.getFeed = function(user_posts, script_feed, user, order, removeFlaggedContent, removedBlockedUserContent) {
    //Final array of all posts to go in the feed
    let finalfeed = [];
    // Array of seen and unseen posts, used when order=='shuffle' so that unseen posts appear before seen posts on the final feed.
    let finalfeed_seen = [];
    let finalfeed_unseen = [];
    //Array of recent user-made posts, within the last 5 minutes. They will be appended to the top of the final feed.
    let new_user_posts = [];

    //While there are regular posts or user-made posts to add to the final feed
    while (script_feed.length || user_posts.length) {
        // If there are no more script_feed posts
        // Or If user_post[0] post is more recent than script_feed[0] post
        if (script_feed[0] === undefined ||
            ((user_posts[0] !== undefined) && (script_feed[0].time < user_posts[0].relativeTime))) {
            // Filter comments to include only past simulated comments, not future simulated comments. 
            user_posts[0].comments = user_posts[0].comments.filter(comment => comment.absTime < Date.now());
            //Look at the post in user_posts[0] now. 
            user_posts[0].comments.sort(function(a, b) {
                return a.relativeTime - b.relativeTime;
            });
            if ((Date.now() - user_posts[0].absTime) < 600000) {
                //if post was made less than 10 minutes ago, it should be spliced into the TOP
                new_user_posts.push(user_posts[0]);
                user_posts.splice(0, 1);
            } else {
                //proceed normally
                finalfeed.push(user_posts[0]);
                user_posts.splice(0, 1);
            }
        } else {
            //Filter comments to include only comments of the experimental condition the user is in.
            script_feed[0].comments = script_feed[0].comments.filter(comment => !comment.class || comment.class == user.experimentalCondition);

            //Filter comments to include only past simulated comments, not future simulated comments.
            script_feed[0].comments = script_feed[0].comments.filter(comment => user.createdAt.getTime() + comment.time < Date.now());

            //Looking at the post in script_feed[0] now.
            //For this post, check if there is a user feedAction matching this post's ID and get its index.
            const feedIndex = _.findIndex(user.feedAction, function(o) { return o.post.equals(script_feed[0].id) });
            if (feedIndex != -1) {
                //User performed an action with this post
                //Check to see if there are comment-type actions.
                if (Array.isArray(user.feedAction[feedIndex].comments) && user.feedAction[feedIndex].comments) {
                    //There are comment-type actions on this post.
                    //For each comment on this post, add likes, flags, etc.
                    for (const commentObject of user.feedAction[feedIndex].comments) {
                        if (commentObject.new_comment) {
                            // This is a new, user-made comment. Add it to the comments
                            // list for this post.
                            const cat = {
                                commentID: commentObject.new_comment_id,
                                body: commentObject.body,
                                likes: commentObject.likes,
                                time: commentObject.relativeTime,

                                new_comment: commentObject.new_comment,
                                liked: commentObject.liked
                            };
                            script_feed[0].comments.push(cat);
                        } else {
                            // This is not a new, user-created comment.
                            // Get the comment index that corresponds to the correct comment
                            const commentIndex = _.findIndex(script_feed[0].comments, function(o) { return o.id == commentObject.comment; });
                            // If this comment's ID is found in script_feed, add likes, flags, etc.
                            if (commentIndex != -1) {
                                // Check if there is a like recorded for this comment.
                                if (commentObject.liked) {
                                    // Update the comment in script_feed.
                                    script_feed[0].comments[commentIndex].liked = true;
                                }
                                // Check if there is a flag recorded for this comment.
                                if (commentObject.flagged) {
                                    // Remove the comment from the post if it has been flagged.
                                    script_feed[0].comments.splice(commentIndex, 1);
                                }
                            }
                        }
                    }
                }
                script_feed[0].comments.sort(function(a, b) {
                    return a.time - b.time;
                });
                // No longer looking at comments on this post.
                // Now we are looking at the main post.
                // Check if there is a like recorded for this post.
                if (user.feedAction[feedIndex].liked) {
                    script_feed[0].like = true;
                    script_feed[0].likes++;
                }
                // Check if post has been flagged: remove it from feed array (script_feed)
                if (user.feedAction[feedIndex].flagTime[0]) {
                    if (removeFlaggedContent) {
                        script_feed.splice(0, 1);
                    } else {
                        script_feed[0].flagged = true;
                    }
                } //Check if post is from a blocked user: remove it from feed array (script_feed)
                else if (user.blocked.includes(script_feed[0].actor.username & removedBlockedUserContent)) {
                    script_feed.splice(0, 1);
                } else {
                    if (order == 'SHUFFLE') {
                        // Check if there user has viewed the post before.
                        if (!user.feedAction[feedIndex].readTime[0]) {
                            finalfeed_unseen.push(script_feed[0]);
                        } else {
                            finalfeed_seen.push(script_feed[0]);
                        }
                    } else {
                        finalfeed.push(script_feed[0]);
                    }
                    script_feed.splice(0, 1);
                }
            } //user did not interact with this post
            else {
                if (user.blocked.includes(script_feed[0].actor.username && removedBlockedUserContent)) {
                    script_feed.splice(0, 1);
                } else {
                    if (order == 'SHUFFLE') {
                        finalfeed_unseen.push(script_feed[0]);
                    } else {
                        finalfeed.push(script_feed[0]);
                    }
                    script_feed.splice(0, 1);
                }
            }
        }
    }
    if (order == 'SHUFFLE') {
        //shuffle the feed
        finalfeed_seen = shuffle(finalfeed_seen);
        finalfeed_unseen = shuffle(finalfeed_unseen);
        finalfeed = finalfeed_unseen.concat(finalfeed_seen);
    }
    //Concatenate the most recent User posts are at the top of timeline
    finalfeed = new_user_posts.concat(finalfeed);
    return finalfeed;
};