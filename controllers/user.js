const passport = require('passport');
const validator = require('validator');
const dotenv = require('dotenv');
dotenv.config({ path: '.env' });
const User = require('../models/User');

/**
 * GET /login
 * Login page.
 */
exports.getLogin = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/login', {
        title: 'Login',
        site_picture: process.env.SITE_PICTURE
    });
};

/**
 * POST /login
 * Sign in using email and password.
 */
exports.postLogin = (req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (validator.isEmpty(req.body.password)) validationErrors.push({ msg: 'Password cannot be blank.' });

    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/login');
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
    passport.authenticate('local', (err, user, info) => {
        const study_length = 86400000 * process.env.NUM_DAYS; //Milliseconds in NUM_DAYS days
        const time_diff = Date.now() - user.createdAt; //Time difference between now and account creation.
        if (err) { return next(err); }
        if (!user) {
            req.flash('errors', info);
            return res.redirect('/login');
        }
        if (!(user.active) || ((time_diff >= study_length) && !user.isAdmin)) {
            const endSurveyLink = user.endSurveyLink;
            req.flash('final', { msg: endSurveyLink });
            return res.redirect('/login');
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            const time_now = Date.now();
            const userAgent = req.headers['user-agent'];
            const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            user.logUser(time_now, userAgent, user_ip);
            if (user.consent) {
                res.redirect(req.session.returnTo || '/');
            } else {
                res.redirect('/account/signup_info');
            }
        });
    })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
exports.logout = (req, res) => {
    req.logout((err) => {
        if (err) console.log('Error : Failed to logout.', err);
        req.session.destroy((err) => {
            if (err) console.log('Error : Failed to destroy the session during logout.', err);
            req.user = null;
            res.redirect('/');
        });
    });
};

/**
 * GET /signup
 * Signup page.
 */
exports.getSignup = (req, res) => {
    if (req.user) {
        return res.redirect('/');
    }
    res.render('account/signup', {
        title: 'Create Account'
    });
};

/**
 * POST /signup
 * Create a new local account.
 */
exports.postSignup = async(req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (!validator.isLength(req.body.password, { min: 4 })) validationErrors.push({ msg: 'Password must be at least 4 characters long.' });
    if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match.' });
    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/signup');
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });

    try {
        const existingUser = await User.findOne({ $or: [{ email: req.body.email }, { mturkID: req.body.mturkID }] }).exec();
        if (existingUser) {
            req.flash('errors', { msg: 'An account with that email address or MTurkID already exists.' });
            return res.redirect('/signup');
        }
        /*###############################
        Place Experimental Varibles Here!
        ###############################*/
        const versions = process.env.NUM_EXP_CONDITIONS;
        const variable_names = process.env.EXP_CONDITIONS_NAMES.split(",");
        const assignedGroup = variable_names[Math.floor(Math.random() * versions)];

        const surveyLink = process.env.POST_SURVEY ? process.env.POST_SURVEY + req.body.mturkID : "";
        const currDate = Date.now();
        const user = new User({
            email: req.body.email,
            password: req.body.password,
            mturkID: req.body.mturkID,
            username: req.body.username,
            group: assignedGroup,
            endSurveyLink: surveyLink,
            active: true,
            lastNotifyVisit: currDate,
            createdAt: currDate
        });
        await user.save();
        req.logIn(user, (err) => {
            if (err) {
                return next(err);
            }
            const userAgent = req.headers['user-agent'];
            const user_ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            user.logUser(currDate, userAgent, user_ip);
            res.redirect('/account/signup_info');
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postSignupInfo = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.profile.name = req.body.name.trim() || '';
        user.profile.location = req.body.location.trim() || '';
        user.profile.bio = req.body.bio.trim() || '';
        if (req.file) {
            user.profile.picture = req.file.filename;
        }

        await user.save();
        req.flash('success', { msg: 'Profile information has been updated.' });
        return res.redirect('/com');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/consent
 * Update consent.
 */
exports.postConsent = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.consent = true;
        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /account
 * Profile page.
 */
exports.getAccount = (req, res) => {
    res.render('account/profile', {
        title: 'Account Management'
    });
};

/**
 * GET /me
 * Profile page.
 */
exports.getMe = async(req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('posts.comments.actor').exec();
        const allPosts = user.getPosts();
        res.render('me', { posts: allPosts, title: user.profile.name || user.email || user.id });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /account/profile
 * Update profile information.
 */
exports.postUpdateProfile = async(req, res, next) => {
    const validationErrors = [];
    if (!validator.isEmail(req.body.email)) validationErrors.push({ msg: 'Please enter a valid email address.' });
    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/account');
    }
    req.body.email = validator.normalizeEmail(req.body.email, { gmail_remove_dots: false });
    try {
        const user = await User.findById(req.user.id).exec();
        user.email = req.body.email || '';
        user.profile.name = req.body.name.trim() || '';
        user.profile.location = req.body.location.trim() || '';
        user.profile.bio = req.body.bio.trim() || '';
        if (req.file) {
            user.profile.picture = req.file.filename;
        }

        await user.save();
        req.flash('success', { msg: 'Profile information has been updated.' });
        res.redirect('/account');
    } catch (err) {
        if (err.code === 11000) {
            req.flash('errors', { msg: 'The email address you have entered is already associated with an account.' });
            return res.redirect('/account');
        }
        next(err);
    }
};

/**
 * POST /account/password
 * Update current password.
 */
exports.postUpdatePassword = async(req, res, next) => {
    const validationErrors = [];
    if (!validator.isLength(req.body.password, { min: 4 })) validationErrors.push({ msg: 'Password must be at least 4 characters long.' });
    if (validator.escape(req.body.password) !== validator.escape(req.body.confirmPassword)) validationErrors.push({ msg: 'Passwords do not match.' });

    if (validationErrors.length) {
        req.flash('errors', validationErrors);
        return res.redirect('/account');
    }
    try {
        const user = await User.findById(req.user.id).exec();
        user.password = req.body.password;
        await user.save();
        req.flash('success', { msg: 'Password has been changed.' });
        res.redirect('/account');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /pageLog
 * Post a pageLog
 */
exports.postPageLog = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        user.logPage(Date.now(), req.body.path);
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /pageTimes
 * Post a pageTime
 */
exports.postPageTime = async(req, res, next) => {
    try {
        const user = await User.findById(req.user.id).exec();
        // What day in the study is the user in? 
        const one_day = 86400000; //number of milliseconds in a day
        const time_diff = Date.now() - user.createdAt; //Time difference between now and account creation.
        const current_day = Math.floor(time_diff / one_day);
        user.pageTimes[current_day] += parseInt(req.body.time);
        await user.save();
        res.set('Content-Type', 'application/json; charset=UTF-8');
        res.send({ result: "success" });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /forgot
 * Forgot Password page.
 */
exports.getForgot = (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    res.render('account/forgot', {
        title: 'Forgot Password',
        email: process.env.RESEARCHER_EMAIL
    });
};

/**
 * Deactivate accounts who are completed with the study, except for admin accounts. Called 3 times a day. Scheduled via CRON jobs in app.js
 */
exports.stillActive = async() => {
    try {
        const activeUsers = await User.find().where('active').equals(true).exec();
        for (const user of activeUsers) {
            const study_length = 86400000 * process.env.NUM_DAYS; //Milliseconds in NUM_DAYS days
            const time_diff = Date.now() - user.createdAt; //Time difference between now and account creation.
            if ((time_diff >= study_length) && !user.isAdmin) {
                user.active = false;
                user.logPostStats();
                await user.save();
            }
        }
    } catch (err) {
        next(err);
    }
};

/**
 * GET /completed
 * Admin Dashboard: Basic information on users currrently in the study
 */
exports.userTestResults = async(req, res) => {
    if (!req.user.isAdmin) {
        res.redirect('/');
    } else {
        try {
            const users = await User.find().where('isAdmin').equals(false).exec();
            for (const user of users) {
                const study_length = 86400000 * process.env.NUM_DAYS; //Milliseconds in NUM_DAYS days
                const time_diff = Date.now() - user.createdAt; //Time difference between now and account creation.
                if ((time_diff >= study_length) && !user.isAdmin) {
                    user.active = false;
                    user.logPostStats();
                    await user.save();
                }
            }
            res.render('completed', { users: users });
        } catch (err) {
            next(err);
        }
    }
};