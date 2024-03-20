/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo');
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const schedule = require('node-schedule');
const multer = require('multer');
const fs = require('fs');
const util = require('util');


fs.readFileAsync = util.promisify(fs.readFile);

/**
 * Middleware for handling multipart/form-data, which is primarily used for uploading files.
 * Files are uploaded when user's upload their profile photos and post photos.
 */
var userpost_options = multer.diskStorage({
    destination: path.join(__dirname, 'uploads/user_post'),
    filename: function(req, file, cb) {
        var lastsix = req.user.id.substr(req.user.id.length - 6);
        var prefix = lastsix + Math.random().toString(36).slice(2, 10);
        cb(null, prefix + file.originalname.replace(/[^A-Z0-9]+/ig, "_"));
    }
});
var useravatar_options = multer.diskStorage({
    destination: path.join(__dirname, 'uploads/user_avatar'),
    filename: function(req, file, cb) {
        var prefix = req.user.id + Math.random().toString(36).slice(2, 10);
        cb(null, prefix + file.originalname.replace(/[^A-Z0-9]+/ig, "_"));
    }
});

const userpostupload = multer({ storage: userpost_options });
const useravatarupload = multer({ storage: useravatar_options });

/**
 * Load environment variables from .env file.
 */
dotenv.config({ path: '.env' });

/**
 * Controllers (route handlers).
 */
const actorsController = require('./controllers/actors');
const scriptController = require('./controllers/script');
const userController = require('./controllers/user');
const notificationController = require('./controllers/notification');

/**
 * API keys and Passport configuration.
 */
const passportConfig = require('./config/passport');

/**
 * Create Express server.
 */
const app = express();

/*add chatbot*/
app.get('/chatbot', (req, res) => {
    res.redirect('http://localhost:3001');
});


/**
 * Connect to MongoDB.
 */
mongoose.connect(process.env.MONGODB_URI);
mongoose.connection.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.');
    process.exit();
});

/**
 * Cron Jobs:
 * Check if users are still active every 8 hours (at 4:30am, 12:30pm, and 20:30pm).
 */
const rule1 = new schedule.RecurrenceRule();
rule1.hour = 4;
rule1.minute = 30;
const j = schedule.scheduleJob(rule1, function() {
    userController.stillActive();
});

const rule2 = new schedule.RecurrenceRule();
rule2.hour = 12;
rule2.minute = 30;
const j2 = schedule.scheduleJob(rule2, function() {
    userController.stillActive();
});

const rule3 = new schedule.RecurrenceRule();
rule3.hour = 20;
rule3.minute = 30;
const j3 = schedule.scheduleJob(rule3, function() {
    userController.stillActive();
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
//app.use(expressStatusMonitor());
app.use(compression());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: false,
        maxAge: 86400000 //24 hours
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    // Multer multipart/form-data handling needs to occur before the Lusca CSRF check.
    // This allows us to not check CSRF when uploading an image file. It's a weird issue that multer and lusca do not play well together.
    if ((req.path === '/post/new') || (req.path === '/account/profile') || (req.path === '/account/signup_info_post')) {
        console.log("Not checking CSRF. Out path now");
        next();
    } else {
        lusca.csrf()(req, res, next);
    }
});

app.use(lusca.xframe('SAMEORIGIN'));
app.use(lusca.xssProtection(true));
app.disable('x-powered-by');
// allow-from https://example.com/
// add_header X-Frame-Options "allow-from https://cornell.qualtrics.com/";
// app.use(lusca.xframe('allow-from https://cornell.qualtrics.com/'));
app.use((req, res, next) => {
    res.locals.user = req.user;
    res.locals.cdn = process.env.CDN;
    next();
});

app.use((req, res, next) => {
    // If a user attempts to access a site page that requires logging in, but they are not logged in, then record the page they desired to visit.
    // After successfully logging in, redirect the user back to their desired page.
    if (!req.user &&
        req.path !== '/login' &&
        req.path !== '/signup' &&
        req.path !== '/pageLog' &&
        req.path !== '/pageTimes' &&
        req.path !== '/notifications' &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.originalUrl;
    }
    next();
});

app.use('/public', express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use('/semantic', express.static(path.join(__dirname, 'semantic'), { maxAge: 31557600000 }));
app.use(express.static(path.join(__dirname, 'uploads'), { maxAge: 31557600000 }));
app.use('/post_pictures', express.static(path.join(__dirname, 'post_pictures'), { maxAge: 31557600000 }));
app.use('/profile_pictures', express.static(path.join(__dirname, 'profile_pictures'), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get('/', passportConfig.isAuthenticated, scriptController.getScript);

app.post('/post/new', userpostupload.single('picinput'), scriptController.newPost);
app.post('/pageLog', passportConfig.isAuthenticated, userController.postPageLog);
app.post('/pageTimes', passportConfig.isAuthenticated, userController.postPageTime);

app.get('/com', function(req, res) {
    const feed = req.query.feed == "true" ? true : false; //Are we accessing the community rules from the feed?
    res.render('com', {
        title: 'Community Rules',
        feed
    });
});

app.get('/info', passportConfig.isAuthenticated, function(req, res) {
    res.render('info', {
        title: 'User Docs'
    });
});

app.get('/tos', function(req, res) { res.render('tos', { title: 'Terms of Service' }); });

app.get('/notifications', passportConfig.isAuthenticated, notificationController.getNotifications);

app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);

app.get('/account', passportConfig.isAuthenticated, userController.getAccount);
app.post('/account/password', passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post('/account/profile', passportConfig.isAuthenticated, useravatarupload.single('picinput'), userController.postUpdateProfile);
app.get('/account/signup_info', passportConfig.isAuthenticated, function(req, res) {
    res.render('account/signup_info', {
        title: 'Add Information'
    });
});
app.post('/account/signup_info_post', passportConfig.isAuthenticated, useravatarupload.single('picinput'), userController.postSignupInfo);
app.post('/account/consent', passportConfig.isAuthenticated, userController.postConsent);

app.get('/me', passportConfig.isAuthenticated, userController.getMe);
app.get('/user/:userId', passportConfig.isAuthenticated, actorsController.getActor);
app.post('/user', passportConfig.isAuthenticated, actorsController.postBlockReportOrFollow);

app.get('/feed', passportConfig.isAuthenticated, scriptController.getScript);
app.post('/feed', passportConfig.isAuthenticated, scriptController.postUpdateFeedAction);
app.post('/userPost_feed', passportConfig.isAuthenticated, scriptController.postUpdateUserPostFeedAction);
app.get('/test', passportConfig.isAuthenticated, function(req, res) {
    res.render('test', {
        title: 'Test'
    })
});


/**
 * Administrator-only routes.
 */
app.get('/completed', passportConfig.isAuthenticated, userController.userTestResults);
app.get('/actors', passportConfig.isAuthenticated, actorsController.getActors);
app.get('/admin', passportConfig.isAuthenticated, function(req, res) {
    res.render('adminDashboard/adminHomePage', {
        title: 'Admin Home'
    })
});
app.get('/simulationContent', passportConfig.isAuthenticated, function(req, res) {
    res.render('adminDashboard/simulationForm', {
        title: 'Simulation Content Form'
    })
});
app.post('/generateSimulationContent', passportConfig.isAuthenticated, function(req, res) {
    res.render('adminDashboard/simulationForm', {
        title: 'Simulation Content Form'
    })
});


/**
 * Error Handler.
 */
app.use(errorHandler());

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // Render the error page
    res.status(err.status || 500);
    res.render('error');
});

/**
 * Start Express server.
 */
app.listen(app.get('port'), () => {
    console.log(`App is running on http://localhost:${app.get('port')} in ${app.get('env')} mode.`);
    console.log('  Press CTRL-C to stop\n');
});
module.exports = app;