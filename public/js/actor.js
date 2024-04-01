$(window).on("load", function() {
    // Button to go to feed
    $('.ui.home.inverted.button').on('click', function() {
        window.location.href = '/';
    });

    $('.coupled.modal').modal({
        allowMultiple: false
    });

    // REPORT Actor Modal #1
    $('.ui.small.report.modal')
        .modal({
            onHidden: function(e) {
                $(".ui.small.report.modal input[type=radio]").each(function() {
                    $(this).prop('checked', false);
                });
                $(".ui.small.report.modal input.ui.green.button").addClass('disabled');
                if (isBlocked) {
                    // Modal for Blocked Users
                    $('.ui.small.basic.blocked.modal').modal('show');
                }
            },
            onVisible: function() {
                $('input:radio[name="report_issue"]').change(function() {
                    $('input.ui.green.button.disabled').removeClass('disabled');
                })
            }
        });

    // REPORT Actor Modal #2
    $('.second.modal').modal({
        closable: false,
        onVisible: function() {
            // Modal for Blocked Users
            $('.second.modal').modal('hide others');
        },
        onHidden: function(modal) {
            if (isBlocked) {
                // Modal for Blocked Users
                $('.ui.small.basic.blocked.modal').modal('show');
            }
        }
    });

    // BLOCK Actor Modal
    $('.ui.small.basic.blocked.modal')
        .modal({
            allowMultiple: false,
            closable: false,
            onDeny: function() {
                // report user
            },
            onApprove: function() {
                // unblock user
                const username = $('button.ui.button.block').attr("username");
                $.post("/user", { unblocked: username, _csrf: $('meta[name="csrf-token"]').attr('content') })
                    .then(function() {
                        isBlocked = false;
                    });
            }
        });

    // attach events to buttons: open second modal with first modal buttons
    $('.second.modal').modal('attach events', '.report.modal .button', 'show');

    // attach events to buttons: open report modal with blocked modal button
    $('.report.modal').modal('attach events', '.blocked.modal .red.button', 'show');

    // REPORT Actor button
    $('.ui.button.report').on('click', function() {
        // show first modal
        $('.ui.small.report.modal').modal('show');
    });

    // REPORT Actor Form
    $('form#reportform').submit(function(e) {
        e.preventDefault();
        isReported = true;
        $.post($(this).attr('action'), $(this).serialize(), function(res) {
            $('.ui.small.basic.blocked.modal').modal('hide');
        });
    });

    // BLOCK Actor button
    $('button.ui.button.block').on('click', function() {
        const username = $(this).attr("username");
        isBlocked = true;
        $.post("/user", { blocked: username, _csrf: $('meta[name="csrf-token"]').attr('content') });

        // Modal for Blocked Users
        $('.ui.small.basic.blocked.modal').modal('show');
    });

    // Actor is already blocked
    if (isBlocked) {
        // Modal for Blocked Users
        $('.ui.small.basic.blocked.modal').modal('show');
    }
});