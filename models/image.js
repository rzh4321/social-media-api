const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const ImageSchema = new Schema({
  filename: String,
  contentType: String,
  data: Buffer,
});

module.exports = mongoose.model('Image', ImageSchema);