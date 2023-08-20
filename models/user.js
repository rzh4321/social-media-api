const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    friends: [{ type: Schema.Types.ObjectId, ref: "User"}],
    profileUrl: { type: String },
    friendRequestsSent: [{ type: Schema.Types.ObjectId, ref: "User"}],
    friendRequestsReceived: [{ type: Schema.Types.ObjectId, ref: "User"}],
    posts: [{ type: Schema.Types.ObjectId, ref: "Post"}],

})

module.exports = mongoose.model("User", UserSchema);