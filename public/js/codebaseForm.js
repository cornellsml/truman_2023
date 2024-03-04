$(window).on("load", function() {
    $("button.ui.large.button.green.submission").on('click', function(e) {
        $("button.ui.large.button.green").addClass("disabled");
        $("button.ui.large.button.green").text("Generating Code...");
    });
});