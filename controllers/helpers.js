const _ = require('lodash');

// From https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
// Function shuffles the content of an array and returns the shuffled array.
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
 * This is a helper function, called in .getNotifications() (./notifications.js controller file), .getScript() (./script.js controller file), .getActor() (./actors.js controller file).
 * It takes in a list of user posts, a list of actor posts, a User document, and other parameters, and it processes and generates a final feed of posts for the user based on these parameters.
 * Parameters: 
 *  - user_posts: list of user posts, typically from user.posts
 *  - script_feed: list of script (actor) posts, typically from a call to the database: Script.find(...)
 *  - user: a User document
 *  - order: 'SHUFFLE', 'CHRONOLOGICAL'; indicates the order the posts in the final feed should be displayed in.
 *  - removedFlaggedContent (boolean): T/F; indicates if a flagged post should be removed from the final feed.
 *  - removedBlockedUserContent (boolean): T/F; indicates if posts from a blocked user should be removed from the final feed.
 * Returns: 
 *  - finalfeed: the processed final feed of posts for the user
 */
exports.getFeed = function(user_posts, script_feed, user, order, removeFlaggedContent, removedBlockedUserContent) {
    // Array of posts for the final feed
    let finalfeed = [];
    // Array of seen and unseen posts, used when order=='shuffle' so that unseen posts appear before seen posts on the final feed.
    let finalfeed_seen = [];
    let finalfeed_unseen = [];
    // Array of recent user posts, made within the last 10 minutes, used to append to the top of the final feed.
    let new_user_posts = [];

    // While there are actor posts or user posts to add to the final feed
    while (script_feed.length || user_posts.length) {
        // If there are no more script_feed posts or if user_post[0] post is more recent than script_feed[0] post, then add user_post[0] post to the finalfeed.
        // Else, add script_feed[0] post to the finalfeed.
        if (script_feed[0] === undefined ||
            ((user_posts[0] !== undefined) && (script_feed[0].time < user_posts[0].relativeTime))) {
            // Filter comments to include only past simulated comments, not future simulated comments. 
            user_posts[0].comments = user_posts[0].comments.filter(comment => comment.absTime < Date.now());
            // Sort comments from least to most recent.
            user_posts[0].comments.sort(function(a, b) {
                return a.relativeTime - b.relativeTime;
            });
            // If the user post was made within the last 10 minutes, it should be appended to the top of the final feed. So, push it to new_user_posts.
            if ((Date.now() - user_posts[0].absTime) < 600000) {
                new_user_posts.push(user_posts[0]);
                user_posts.splice(0, 1);
            } // Else, proceed normally.
            else {
                finalfeed.push(user_posts[0]);
                user_posts.splice(0, 1);
            }
        } else {
            // Filter comments to include only comments labeled with the experimental condition the user is in.
            script_feed[0].comments = script_feed[0].comments.filter(comment => !comment.class || comment.class == user.experimentalCondition);

            // Filter comments to include only past simulated comments, not future simulated comments.
            script_feed[0].comments = script_feed[0].comments.filter(comment => user.createdAt.getTime() + comment.time < Date.now());

            // Check if the user has interacted with this post by checking if a user.feedAction.post value matches this script_feed[0]'s _id. 
            // If the user has interacted with this post, add the user's interactions to the post.
            const feedIndex = _.findIndex(user.feedAction, function(o) { return o.post.equals(script_feed[0].id) });
            if (feedIndex != -1) {
                // Check if there are comment-type actions on this post.
                if (Array.isArray(user.feedAction[feedIndex].comments) && user.feedAction[feedIndex].comments) {
                    for (const commentObject of user.feedAction[feedIndex].comments) {
                        // This is a user-made comment. Append it to the comments list for this post.
                        if (commentObject.new_comment) {
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
                            // This is not a user-made comment.
                            // Get the index of the comment in the post.
                            const commentIndex = _.findIndex(script_feed[0].comments, function(o) { return o.id == commentObject.comment; });
                            if (commentIndex != -1) {
                                // Check if this comment has been liked by the user. If true, update the comment in the post.
                                if (commentObject.liked) {
                                    script_feed[0].comments[commentIndex].liked = true;
                                }
                                // Check if this comment has been flagged by the user. If true, remove the comment from the post.
                                if (commentObject.flagged) {
                                    if (removeFlaggedContent) {
                                        script_feed[0].comments.splice(commentIndex, 1);
                                    } else {
                                        script_feed[0].comments[commentIndex].flagged = true;
                                    }
                                }
                            }
                            // Check if this comment is by a blocked user: If true and removedBlockedUserContent is true, remove the comment.
                            if (user.blocked.includes(commentObject.actor.username) && removedBlockedUserContent) {
                                script_feed[0].comments.splice(script_feed[0].comments.indexOf(commentObject), 1);
                            }
                        }
                    }
                }
                // Sort the comments in the post from least to most recent.
                script_feed[0].comments.sort(function(a, b) {
                    return a.time - b.time;
                });

                // No longer looking at comments on this post.
                // Now we are looking at the main post.
                // Check if this post has been liked by the user. If true, update the post.
                if (user.feedAction[feedIndex].liked) {
                    script_feed[0].liked = true;
                    script_feed[0].likes++;
                }
                // Check if this post has been flagged by the user. If true, update the post.
                if (user.feedAction[feedIndex].flagged) {
                    script_feed[0].flagged = true;
                }
                // Check if removeFlaggedContent is true, remove the post.
                if (user.feedAction[feedIndex].flagged && removeFlaggedContent) {
                    script_feed.splice(0, 1);
                } // Check if this post is by a blocked user: If true and removedBlockedUserContent is true, remove the post.
                else if (user.blocked.includes(script_feed[0].actor.username) && removedBlockedUserContent) {
                    script_feed.splice(0, 1);
                } else {
                    // If the post is neither flagged or from a blocked user, add it to the final feed.
                    // If the final feed is shuffled, add posts to finalfeed_unseen and finalfeed_seen based on if the user has seen the post before or not.
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
            } // If the user has not interacted with this post:
            else {
                if (user.blocked.includes(script_feed[0].actor.username) && removedBlockedUserContent) {
                    script_feed.splice(0, 1);
                } else {
                    for (const commentObject of script_feed[0].comments) {
                        // Check if this comment is by a blocked user: If true and removedBlockedUserContent is true, remove the comment.
                        if (user.blocked.includes(commentObject.actor.username) && removedBlockedUserContent) {
                            script_feed[0].comments.splice(script_feed[0].comments.indexOf(commentObject), 1);
                        }
                    }
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
        // Shuffle the feed
        finalfeed_seen = shuffle(finalfeed_seen);
        finalfeed_unseen = shuffle(finalfeed_unseen);
        finalfeed = finalfeed_unseen.concat(finalfeed_seen);
    }
    // Concatenate the most recent user posts to the front of finalfeed.
    finalfeed = new_user_posts.concat(finalfeed);
    return finalfeed;
};