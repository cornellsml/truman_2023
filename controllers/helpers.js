const _ = require("lodash");

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
      array[randomIndex],
      array[currentIndex],
    ];
  }
  return array;
}

/**
 * This is a helper function, called in .getScript() (./script.js controller file), .getActor() (./actors.js controller file).
 * It takes in a list of user and actor posts, a User document, and other parameters, and it processes and generates a final feed of posts for the user based on these parameters.
 * Parameters:
 *  - script_feed: list of all posts, typically from a call to the database: Script.find(...)
 *  - user: a User document
 *  - order: 'SHUFFLE', 'CHRONOLOGICAL'; indicates the order the posts in the final feed should be displayed in.
 *  - removedFlaggedContent (boolean): T/F; indicates if a flagged post should be removed from the final feed.
 *  - removedBlockedUserContent (boolean): T/F; indicates if posts from a blocked user should be removed from the final feed.
 * Returns:
 *  - finalfeed: the processed final feed of posts for the user
 */
exports.getFeed = function (
  next,
  script_feed,
  user,
  order,
  removeFlaggedContent,
  removedBlockedUserContent,
) {
  try {
    // Array of posts for the final feed
    let finalfeed = [];
    // Array of seen and unseen posts, used when order=='shuffle' so that unseen posts appear before seen posts on the final feed.
    let finalfeed_seen = [];
    let finalfeed_unseen = [];

    // While there are actor posts or user posts to add to the final feed
    while (script_feed.length) {
      // If the post is not an actor post and its sessionID doesn't match the sessionID of the current user, remove the post from the final feed
      if (
        script_feed[0].postType !== "Actor" &&
        script_feed[0].poster.sessionID != user.sessionID
      ) {
        script_feed.splice(0, 1);
        continue;
      }

      // Filter comments to include only comments labeled with the experimental condition the user is in.
      script_feed[0].comments = script_feed[0].comments.filter(
        (comment) =>
          !comment.class || comment.class == user.experimentalCondition,
      );

      // Filter comments to include only past simulated comments, not future simulated comments.
      script_feed[0].comments = script_feed[0].comments.filter(
        (comment) => comment.absTime.getTime() < Date.now(),
      );

      // Check if user has any interactions with comments
      for (const commentObject of script_feed[0].comments) {
        // update comment likes with likes from actors
        commentObject.likes += commentObject.actorLikes;
        // check if user has interacted with this comment
        const commentIndex = _.findIndex(user.commentAction, function (o) {
          return o.comment.equals(commentObject._id);
        });
        if (commentIndex != -1) {
          // Check if this comment has been liked by the user. If true, update the comment in the post.
          if (user.commentAction[commentIndex].liked) {
            commentObject.liked = true;
          }
          // Check if this comment has been flagged by the user. If true, remove the comment from the post.
          if (user.commentAction[commentIndex].flagged) {
            if (removeFlaggedContent) {
              script_feed[0].comments.splice(
                script_feed[0].comments.indexOf(commentObject),
                1,
              );
            } else {
              commentObject.flagged = true;
            }
          }
        }
        // Check if this comment is by a blocked user: If true and removedBlockedUserContent is true, remove the comment.
        if (
          user.blocked.includes(commentObject.commentor.username) &&
          removedBlockedUserContent
        ) {
          script_feed[0].comments.splice(
            script_feed[0].comments.indexOf(commentObject),
            1,
          );
        }
      }

      // Sort the comments in the post from least to most recent.
      script_feed[0].comments.sort(function (a, b) {
        return a.absTime - b.absTime;
      });

      // update post likes with likes from actors
      script_feed[0].likes += script_feed[0].actorLikes;

      // Check if the user has interacted with this post by checking if a user.postAction.post value matches this script_feed[0]'s _id.
      // If the user has interacted with this post, add the user's interactions to the post.
      const feedIndex = _.findIndex(user.postAction, function (o) {
        return o.post.equals(script_feed[0].id);
      });
      if (feedIndex != -1) {
        // Check if this post has been liked by the user. If true, update the post.
        if (user.postAction[feedIndex].liked) {
          script_feed[0].liked = true;
        }
        // Check if this post has been flagged by the user. If true, update the post.
        if (user.postAction[feedIndex].flagged) {
          script_feed[0].flagged = true;
        }
        // Check if removeFlaggedContent is true, remove the post.
        if (user.postAction[feedIndex].flagged && removeFlaggedContent) {
          script_feed.splice(0, 1);
        } // Check if this post is by a blocked user: If true and removedBlockedUserContent is true, remove the post.
        else if (
          user.blocked.includes(script_feed[0].poster.username) &&
          removedBlockedUserContent
        ) {
          script_feed.splice(0, 1);
        } else {
          // If the post is neither flagged or from a blocked user, add it to the final feed.
          // If the final feed is shuffled, add posts to finalfeed_unseen and finalfeed_seen based on if the user has seen the post before or not.
          if (order == "SHUFFLE") {
            // Check if there user has viewed the post before.
            if (!user.postAction[feedIndex].readTime[0]) {
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
        if (
          user.blocked.includes(script_feed[0].poster.username) &&
          removedBlockedUserContent
        ) {
          script_feed.splice(0, 1);
        } else {
          for (const commentObject of script_feed[0].comments) {
            // Check if this comment is by a blocked user: If true and removedBlockedUserContent is true, remove the comment.
            if (
              user.blocked.includes(commentObject.commentor.username) &&
              removedBlockedUserContent
            ) {
              script_feed[0].comments.splice(
                script_feed[0].comments.indexOf(commentObject),
                1,
              );
            }
          }
          if (order == "SHUFFLE") {
            finalfeed_unseen.push(script_feed[0]);
          } else {
            finalfeed.push(script_feed[0]);
          }
          script_feed.splice(0, 1);
        }
      }
    }
    if (order == "SHUFFLE") {
      // Shuffle the feed
      finalfeed_seen = shuffle(finalfeed_seen);
      finalfeed_unseen = shuffle(finalfeed_unseen);
      finalfeed = finalfeed_unseen.concat(finalfeed_seen);
    }

    return finalfeed;
  } catch (err) {
    console.log(err);
    next(err);
  }
};
