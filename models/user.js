const mongoose = require('mongoose')
const router = require('../routes/feed')
const Schema = mongoose.Schema

const userScheme = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'I am new',
  },
  posts: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Post',
    },
  ],
})

module.exports = mongoose.model('User', userScheme)
