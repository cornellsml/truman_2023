/*
This script is run from the command line.
<node updatePassword.js [email] [password]>

Update the account associated with the provided email with the provided password.

This script uses the connection information from your local .env file (in line 22 or server)
so set your local .env variables to match the database you want to connect to.
*/

const User = require("./models/User.js");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

/**
 * Load environment variables from .env file.
 */
dotenv.config({ path: ".env" });

/**
 * Connect to MongoDB.
 */
// establish initial Mongoose connection
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
// listen for errors after establishing initial connection
mongoose.connection.on("error", (err) => {
  console.error(err);
  console.error("MongoDB connection error.");
  process.exit(1);
});

const color_start = "\x1b[33m%s\x1b[0m"; // yellow
const color_success = "\x1b[32m%s\x1b[0m"; // green
const color_error = "\x1b[31m%s\x1b[0m"; // red

async function changePassword() {
  // command inputs
  const myArgs = process.argv.slice(2);
  const email = myArgs[0];
  const password = myArgs[1];
  console.log(color_start, `Changing password...`);

  const existingUser = await User.findOne({ email: email }).exec();
  if (existingUser) {
    existingUser.password = password;
    await existingUser.save();
    console.log(
      color_success,
      `Password successfully changed to: ${password}. Closing db connection.`,
    );
    mongoose.connection.close();
    return;
  } else {
    console.error(
      color_error,
      `ERROR: An account with this email doesn't exist.`,
    );
    mongoose.connection.close();
    return;
  }
}

changePassword();
