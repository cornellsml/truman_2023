//Before Page load:
$('#content').hide();
$('#loading').show();
let isActive = false;
let activeStartTime;

function resetActiveTimer(loggingOut) {
    if (isActive) {
        const currentTime = new Date();
        const activeDuration = currentTime - activeStartTime;
        if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/forgot') {
            $.post("/pageTimes", {
                time: activeDuration,
                _csrf: $('meta[name="csrf-token"]').attr('content')
            }).then(function() {
                if (loggingOut) {
                    window.loggingOut = true;
                    window.location.href = '/logout';
                }
            })
        }
        isActive = false;
    }
}

$(window).on("load", function() {
    /**
     * Recording user's active time on website:
     */
    // From the first answer from https://stackoverflow.com/questions/667555/how-to-detect-idle-time-in-javascript
    let idleTime = 0;
    // Definition of an active user: mouse movement, clicks etc.
    // idleTime is reset to 0 whenever mouse movement occurs.
    $('#pagegrid').on('mousemove keypress scroll mousewheel', function() {
        //If there hasn't been a "start time" for activity, set it. We use session storage so we can track activity when pages changes too.
        if (!isActive) {
            activeStartTime = Date.now();
            isActive = true;
        }
        idleTime = 0;
    });

    // Every 15 seconds, increase idleTime by 1. If idleTime is greater than 4 (i.e. there has been inactivity for about 60-74 seconds, log the duration of activity and reset the active timer)
    setInterval(function() {
        idleTime += 1;
        if (idleTime > 4) { // 60.001-74.999 seconds (idle time)
            resetActiveTimer(false);
        }
    }, 15000);

    // When a user logs out of the website, log the duration of activity and reset the active timer).
    $('a.item.logoutLink').on('click', function() {
        resetActiveTimer(true);
    });

    /**
     * Other site functionalities:
     */
    // Close loading dimmer on content load.
    $('#loading').hide();
    $('#content').fadeIn('slow');

    // Fomantic UI: Enable closing messages
    $('.message .close').on('click', function() {
        $(this).closest('.message').transition('fade');
    });
    // Fomantic UI: Enable checkboxes
    $('.checkbox').checkbox();

    // Check if user has any notifications every 5 seconds.
    if (window.location.pathname !== '/login' && window.location.pathname !== '/signup' && window.location.pathname !== '/forgot') {
        $.post("/pageLog", {
            path: window.location.pathname,
            _csrf: $('meta[name="csrf-token"]').attr('content')
        });
        if (window.location.pathname !== '/notifications') {
            setInterval(function() {
                // method to be executed;
                $.getJSON("/notifications", { bell: true }, function(json) {
                    if (json.count != 0) {
                        $("i.big.alarm.icon").replaceWith('<i class="big icons"><i class="red alarm icon"></i><i class="corner yellow lightning icon"></i></i>');
                    }
                });
            }, 5000);
        }
    };

    // Picture Preview on Image Selection (Used for: uploading new post, updating profile)
    function readURL(input) {
        if (input.files && input.files[0]) {
            let reader = new FileReader();
            reader.onload = function(e) {
                $('#imgInp').attr('src', e.target.result);
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    $("#picinput").change(function() {
        readURL(this);
    });

    // Lazy loading of images on site
    $(`#content .fluid.card .img img, #content img.ui.avatar.image, #content a.avatar img`).visibility({
        type: 'image'
    });
});

$(window).on("beforeunload", function() {
    // https: //developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
    if (!window.loggingOut) {
        resetActiveTimer(false);
    }
});