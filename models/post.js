const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PostSchema = new Schema({
    content: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'Like' }],
    comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    timestamp: { type: Date, default: Date.now },
})

module.exports = mongoose.model('Post', PostSchema);