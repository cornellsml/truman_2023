const passport = require("passport");
const { Strategy: LocalStrategy } = require("passport-local");

const User = require("../models/User");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    return done(null, await User.findById(id));
  } catch (error) {
    return done(error);
  }
});

/**
 * Sign in using Email and Password.
 */
passport.use(
  new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    User.findOne({ email: email.toLowerCase() })
      .then((user) => {
        if (!user) {
          return done(null, false, { msg: `Email ${email} not found.` });
        }
        user.comparePassword(password, (err, isMatch) => {
          if (err) {
            return done(err);
          }
          if (isMatch) {
            return done(null, user);
          }
          return done(null, false, { msg: "Invalid email or password." });
        });
      })
      .catch((err) => done(err));
  }),
);

/**
 * Middleware.
 */
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login" + (req.query.r_id ? `?r_id=${req.query.r_id}` : ""));
};
