function adjustContentMargin() {
    let contentMargin;
    if ($('.adminDashboardMobileMenu').is(':visible')) {
        // if mobile menu is visible, add margin to the top of the content column
        $('.dashboardContentColumn').css('margin-left', 'initial');
        contentMargin = parseInt($('.adminDashboardMobileMenu').css('height'));
        $('.dashboardContentColumn').css('margin-top', contentMargin);
    } else if ($('.adminDashboardMenu').is(':visible')) {
        // if standard menu is visible, add margin (if needed) to the left of the content column
        $('.dashboardContentColumn').css('margin-top', '30px');
        let marginValue = parseInt($('.ui.vertically.padded.grid.container').css('margin-right'));
        let menuWidth = parseInt($('.adminDashboardMenu').css('width'));
        if (menuWidth > marginValue) {
            contentMargin = menuWidth - marginValue;
            $('.dashboardContentColumn').css('margin-left', contentMargin);
        }
    }
}

function setActiveMenuItem() {
    console.log(window.location.pathname);
    const url = window.location.pathname;
    $('.adminDashboardMenu .item[href="' + url + '"]').addClass('active');
    $('.adminDashboardMobileMenu .item[href="' + url + '"]').addClass('active');
}

$(window).on('load', function() {
    adjustContentMargin();
    $('.dashboardContentColumn').css('visibility', 'visible');
    setActiveMenuItem();
});

$(window).on('resize', function() {
    adjustContentMargin();
});