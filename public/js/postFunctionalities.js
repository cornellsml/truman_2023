function likePost(e) {
    const target = $(e.target).closest('.ui.like.button');
    const label = target.closest('.ui.like.button').next("a.ui.basic.red.left.pointing.label.count");
    const postID = target.closest(".ui.fluid.card").attr("postID");
    const postClass = target.closest(".ui.fluid.card").attr("postClass");
    const currDate = Date.now();

    if (target.hasClass("red")) { //Unlike Post
        target.removeClass("red");
        label.html(function(i, val) { return val * 1 - 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                unlike: currDate,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        else
            $.post("/feed", {
                postID: postID,
                unlike: currDate,
                postClass: postClass,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
    } else { //Like Post
        target.addClass("red");
        label.html(function(i, val) { return val * 1 + 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                like: currDate,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        else
            $.post("/feed", {
                postID: postID,
                like: currDate,
                postClass: postClass,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
    }
}

function flagPost(e) {
    const target = $(e.target);
    const post = target.closest(".ui.fluid.card.dim");
    const postID = post.attr("postID");
    const postClass = target.closest(".ui.fluid.card").attr("postClass");
    const flag = Date.now();

    $.post("/feed", {
        postID: postID,
        flag: flag,
        postClass: postClass,
        _csrf: $('meta[name="csrf-token"]').attr('content')
    });
    post.find(".ui.dimmer.flag").dimmer({ closable: false }).dimmer('show');
    //repeat to ensure its closable
    post.find(".ui.dimmer.flag").dimmer({ closable: false }).dimmer('show');
}

function likeComment(e) {
    const target = $(e.target);
    const comment = target.parents(".comment");
    const label = comment.find("span.num");

    const postID = target.closest(".ui.fluid.card").attr("postID");
    const postClass = target.closest(".ui.fluid.card").attr("postClass");
    const commentID = comment.attr("commentID");
    const isUserComment = comment.find("a.author").attr('href') === '/me';
    const currDate = Date.now();

    if (target.hasClass("red")) { //Unlike comment
        target.removeClass("red");
        comment.find("i.heart.icon").removeClass("red");
        target.html('Like');
        label.html(function(i, val) { return val * 1 - 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost') {
            $.post("/userPost_feed", {
                postID: postID,
                commentID: commentID,
                unlike: currDate,
                isUserComment: isUserComment,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        } else {
            $.post("/feed", {
                postID: postID,
                commentID: commentID,
                unlike: currDate,
                isUserComment: isUserComment,
                postClass: postClass,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        }
    } else { //Like comment
        target.addClass("red");
        comment.find("i.heart.icon").addClass("red");
        target.html('Unlike');
        label.html(function(i, val) { return val * 1 + 1 });

        if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                commentID: commentID,
                like: currDate,
                isUserComment: isUserComment,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
        else
            $.post("/feed", {
                postID: postID,
                commentID: commentID,
                like: currDate,
                isUserComment: isUserComment,
                postClass: postClass,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            });
    }
}

function flagComment(e) {
    const target = $(e.target);
    const comment = target.parents(".comment");
    const postID = target.closest(".ui.fluid.card").attr("postID");
    const postClass = target.closest(".ui.fluid.card").attr("postClass");
    const commentID = comment.attr("commentID");
    comment.replaceWith(`
        <div class="comment" commentID="${commentID}" style="background-color:black;color:white">
            <h5 class="ui inverted header" style="padding-bottom: 0.5em; padding-left: 0.5em;">
                The admins will review this comment further. We are sorry you had this experience.
            </h5>
        </div>`);
    const flag = Date.now();

    if (target.closest(".ui.fluid.card").attr("type") == 'userPost')
        console.log("Should never be here.")
    else
        $.post("/feed", {
            postID: postID,
            commentID: commentID,
            flag: flag,
            postClass: postClass,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
}

function addComment(e) {
    const target = $(e.target);
    const text = target.siblings(".ui.form").find("textarea.newcomment").val().trim();
    const card = target.parents(".ui.fluid.card");
    let comments = card.find(".ui.comments");
    const postClass = target.closest(".ui.fluid.card").attr("postClass");
    //no comments area - add it
    if (!comments.length) {
        const buttons = card.find(".ui.bottom.attached.icon.buttons")
        buttons.after('<div class="content"><div class="ui comments"></div>');
        comments = card.find(".ui.comments")
    }
    if (text.trim() !== '') {
        const currDate = Date.now();
        const ava = target.siblings('.ui.label').find('img.ui.avatar.image');
        const ava_img = ava.attr("src");
        const ava_name = ava.attr("name");
        const postID = card.attr("postID");
        const commentID = numComments + 1;

        const mess = `
        <div class="comment" commentID=${commentID}>
            <a class="avatar"><img src="${ava_img}"></a>
            <div class="content"> 
                <a class="author" href="/me">${ava_name}</a>
                <div class="metadata"> 
                    <span class="date">${humanized_time_span(currDate)}</span>
                    <i class="heart icon"></i> 
                    <span class="num"> 0 </span> Likes
                </div> 
                <div class="text">${text}</div>
                <div class="actions"> 
                    <a class="like comment" onClick="likeComment(event)">Like</a> 
                </div> 
            </div>
        </div>`;
        $(this).siblings(".ui.form").find("textarea.newcomment").val('');
        comments.append(mess);

        if (card.attr("type") == 'userPost')
            $.post("/userPost_feed", {
                postID: postID,
                new_comment: currDate,
                comment_text: text,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                numComments = json.numComments;
            });
        else
            $.post("/feed", {
                postID: postID,
                new_comment: currDate,
                comment_text: text,
                postClass: postClass,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function(json) {
                numComments = json.numComments;
            });
    }
}

function followUser(e) {
    const target = $(e.target);
    const username = target.attr('actor_un');
    if (target.text().trim() == "Follow") { //Follow Actor
        $(`.ui.basic.primary.follow.button[actor_un='${username}']`).each(function(i, element) {
            const button = $(element);
            button.text("Following");
            button.prepend("<i class='check icon'></i>");
        })
        $.post("/user", {
            followed: username,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        })
    } else { //Unfollow Actor
        $(`.ui.basic.primary.follow.button[actor_un='${username}']`).each(function(i, element) {
            const button = $(element);
            button.text("Follow");
            button.find('i').remove();
        })
        $.post("/user", {
            unfollowed: username,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        })
    }
}

$(window).on('load', () => {
    //add humanized time to all posts
    $('.right.floated.time.meta, .date').each(function() {
        const ms = parseInt($(this).text(), 10);
        const time = new Date(ms);
        $(this).text(humanized_time_span(time));
    });

    // ************ Actions on Main Post ***************
    // Focus new comment element if "Reply" button is clicked
    $('.reply.button').on('click', function() {
        let parent = $(this).closest(".ui.fluid.card");
        parent.find("textarea.newcomment").focus();
    });

    // Press enter to submit a comment
    $("textarea.newcomment").keydown(function(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.stopImmediatePropagation();
            $(this).parents(".ui.form").siblings("i.big.send.link.icon").click();
        }
    });

    //Create a new Comment
    $("i.big.send.link.icon").on('click', addComment);

    //Like/Unlike Post
    $('.like.button').on('click', likePost);

    //Flag Post
    $('.flag.button').on('click', flagPost);

    // ************ Actions on Comments***************
    // Like/Unlike comment
    $('a.like.comment').on('click', likeComment);

    //Flag comment
    $('a.flag.comment').on('click', flagComment);

    //Follow button
    $('.ui.basic.primary.follow.button').on('click', followUser);

    // Track how long a post is on the screen (borders are defined by image)
    // Start time: When the entire photo is visible in the viewport.
    // End time: When the entire photo is no longer visible in the viewport.
    $('.ui.fluid.card .img.post').visibility({
        once: false,
        continuous: false,
        observeChanges: true,
        //throttle:100,
        initialCheck: true,
        offset: 50,

        //Handling scrolling down like normal
        //Called when bottomVisible turns true (bottom of a picture is visible): bottom can enter from top or bottom of viewport
        onBottomVisible: function(element) {
            var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
            // Bottom of picture enters from bottom (scrolling down the feed; as normal)
            if (element.topVisible) { // Scrolling Down AND entire post is visible on the viewport 
                // If this is the first time bottom is visible
                if (startTime == 0) {
                    var startTime = Date.now();
                }
            } else { //Scrolling up and this event does not matter, since entire photo isn't visible anyways.
                var startTime = 0;
            }
            $(this).siblings(".content").children(".myTimer").text(startTime);
        },

        //Element's bottom edge has passed top of the screen (disappearing); happens only when Scrolling Up
        onBottomPassed: function(element) {
            var endTime = Date.now();
            var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
            var totalViewTime = endTime - startTime; //TOTAL TIME HERE

            var parent = $(this).parents(".ui.fluid.card");
            var postID = parent.attr("postID");
            var postClass = parent.attr("postClass");
            // If user viewed it for less than 24 hours, but more than 1.5 seconds (just in case)
            if (totalViewTime < 86400000 && totalViewTime > 1500 && startTime > 0) {
                $.post("/feed", {
                    postID: postID,
                    viewed: totalViewTime,
                    postClass: postClass,
                    _csrf: $('meta[name="csrf-token"]').attr('content')
                });
                // Reset Timer
                $(this).siblings(".content").children(".myTimer").text(0);
            }
        },

        //Handling scrolling up
        //Element's top edge has passed top of the screen (appearing); happens only when Scrolling Up
        onTopPassedReverse: function(element) {
            var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
            if (element.bottomVisible && startTime == 0) { // Scrolling Up AND entire post is visible on the viewport 
                var startTime = Date.now();
                $(this).siblings(".content").children(".myTimer").text(startTime);
            }
        },

        // Called when topVisible turns false (exits from top or bottom)
        onTopVisibleReverse: function(element) {
            if (element.topPassed) { //Scrolling Down, disappears on top; this event doesn't matter (since it is when bottom disappears that time is stopped)
            } else { // False when Scrolling Up (the bottom of photo exits screen.)
                var endTime = Date.now();
                var startTime = parseInt($(this).siblings(".content").children(".myTimer").text());
                var totalViewTime = endTime - startTime;

                var parent = $(this).parents(".ui.fluid.card");
                var postID = parent.attr("postID");
                var postClass = parent.attr("postClass");
                // If user viewed it for less than 24 hours, but more than 1.5 seconds (just in case)
                if (totalViewTime < 86400000 && totalViewTime > 1500 && startTime > 0) {
                    $.post("/feed", {
                        postID: postID,
                        viewed: totalViewTime,
                        postClass: postClass,
                        _csrf: $('meta[name="csrf-token"]').attr('content')
                    });
                    // Reset Timer
                    $(this).siblings(".content").children(".myTimer").text(0);
                }
            }
        }
    });
});