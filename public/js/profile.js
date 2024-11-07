$(window).on("load", function () {
  function isPasswordFilled() {
    let isFilled = true;
    // Check passwords match and password is longer than 4
    if (
      $('input[type="password"][id="password"]').val() !==
        $('input[type="password"][id="confirmPassword"]').val() ||
      $('input[type="password"][id="password"]').val().length < 4 ||
      $('input[type="password"][id="confirmPassword"]').val().length < 4
    ) {
      isFilled = false;
    }

    if (
      $('input[type="password"][id="password"]').val().length >= 1 &&
      $('input[type="password"][id="confirmPassword"]').val().length >= 1
    ) {
      if (
        $('input[type="password"][id="password"]').val().length < 4 &&
        $('input[type="password"][id="confirmPassword"]').val().length < 4
      ) {
        $("#passwordsMatch").html(
          "<i class='icon times red'></i><span style='color: red'>Password is too short. Must be at least 4 characters long.</span>",
        );
        $("#passwordsMatch").css("visibility", "visible");
      } else if (
        $('input[type="password"][id="password"]').val() !==
        $('input[type="password"][id="confirmPassword"]').val()
      ) {
        $("#passwordsMatch").html(
          "<i class='icon times red'></i><span style='color: red'>Passwords do not match.</span>",
        );
        $("#passwordsMatch").css("visibility", "visible");
      } else {
        $("#passwordsMatch").html(
          "<i class='icon check'></i><span>Passwords match.</span>",
        );
        isFilled = true;
        $("#passwordsMatch").css("visibility", "visible");
      }
    } else {
      $("#passwordsMatch").css("visibility", "hidden");
    }
    return isFilled;
  }

  function enableSaveBtn() {
    let isFilled = true;
    // Check Username and MTurkID is not blank
    $('input[type="text"]').each(function (index) {
      if ($(this).val().trim().length === 0) {
        isFilled = false;
        return false;
      }
    });
    // Check email is valid
    if ($('input[type="email"]').is(":invalid")) {
      isFilled = false;
    }
    // Check TOS is checked
    if (!$(".ui.checkbox").hasClass("checked")) {
      isFilled = false;
    }
    // Check passwords match and password is longer than 4
    if (isPasswordFilled() && isFilled) {
      $("button.ui.button").addClass("green");
    } else {
      $("button.ui.button").removeClass("green");
    }
  }

  // Sign Up FORM Button: Form validation to make Sign Up button green
  $('form[id="signup-form"] input[required]').on("input", function () {
    enableSaveBtn();
  });
  $('form[id="signup-form"] input[type="checkbox"]').on("change", function () {
    enableSaveBtn();
  });

  // Update Profile and Password FORM: Form validation
  $('form[id="profile"] input').on("input", function () {
    $('form[id="profile"] button').removeClass("disabled").addClass("green");
  });
  $('form[id="password"] input').on("input", function () {
    $('form[id="password"] button').removeClass("disabled");

    if (isPasswordFilled()) {
      $('form[id="password"] button').addClass("green");
    } else {
      $('form[id="password"] button').removeClass("green");
    }
  });
});
