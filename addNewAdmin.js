/*
This script is run from the command line.
<node addNewAdmin.js [email] [username] [password]>

Create a new admin account with the requested email, username, and password.

This script uses the connection information from your local .env file (in line 22 or server)
so set your local .env variables to match the database you want to connect to.
*/

const User = require('./models/User.js');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

/**
 * Load environment variables from .env file.
 */
dotenv.config({ path: '.env' });

/**
 * Connect to MongoDB.
 */
// establish initial Mongoose connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
// listen for errors after establishing initial connection
mongoose.connection.on('error', (err) => {
    console.error(err);
    console.log('%s MongoDB connection error.');
    process.exit(1);
});

const color_start = '\x1b[33m%s\x1b[0m'; // yellow
const color_success = '\x1b[32m%s\x1b[0m'; // green
const color_error = '\x1b[31m%s\x1b[0m'; // red

async function addAdminToDB() {
    // command inputs
    const myArgs = process.argv.slice(2);
    const email = myArgs[0]
    const username = myArgs[1];
    const password = myArgs[2];
    const currDate = Date.now();
    console.log(color_start, `Creating new admin...`);

    const user = new User({
        email: email,
        username: username,
        password: password,
        active: true,
        isAdmin: true,
        createdAt: currDate,
        mturkID: username,
        consent: true
    });
    try {
        const existingUser = await User.findOne({ email: email }).exec();
        if (existingUser) {
            console.log(color_error, `ERROR: This email is already taken.`);
            mongoose.connection.close();
            return;
        }
        await user.save();

        console.log(color_success, `Account successfully created. Closing db connection.`);
        mongoose.connection.close();
    } catch (err) {
        next(err);
    }
}

addAdminToDB();