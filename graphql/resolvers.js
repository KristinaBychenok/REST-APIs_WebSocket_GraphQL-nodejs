const User = require('../models/user')
const Post = require('../models/post')
const bcrypt = require('bcryptjs')
// express-validator use this validator behind the scene
const validator = require('validator')

const jwt = require('jsonwebtoken')
const { clearImage } = require('../util/file')

module.exports = {
  createUser: async function ({ userInput }, req) {
    // const email = userInput.email

    // validation
    const errors = []
    if (!validator.isEmail(userInput.email)) {
      errors.push({ message: 'Email is invalid!' })
    }
    if (
      validator.isEmpty(userInput.password) ||
      !validator.isLength(userInput.password, { min: 5 })
    ) {
      errors.push({ message: 'Password too short!' })
    }
    if (errors.length > 0) {
      const error = new Error('Invalid Input!')
      error.data = errors
      error.code = 422
      throw error
    }

    // creation new User
    const existingUser = await User.findOne({ email: userInput.email })

    if (existingUser) {
      const error = new Error('User exist already')
      throw error
    }

    const hashedPassword = await bcrypt.hash(userInput.password, 12)
    const user = new User({
      email: userInput.email,
      password: hashedPassword,
      name: userInput.name,
    })
    const savedUser = await user.save()

    return { ...savedUser._doc, _id: savedUser._id.toString() }
  },

  login: async function ({ email, password }) {
    const existingUser = await User.findOne({ email: email })
    if (!existingUser) {
      const error = new Error('User not founded')
      error.code = 401
      throw error
    }

    const isEqual = await bcrypt.compare(password, existingUser.password)
    if (!isEqual) {
      const error = new Error('Wrong password!')
      error.code = 401
      throw error
    }
    const token = jwt.sign(
      {
        email: existingUser.email,
        userId: existingUser._id.toString(),
      },
      'somesupersecretsecret',
      { expiresIn: '1h' }
    )
    return { token: token, userId: existingUser._id.toString() }
  },

  createPost: async function ({ postInput }, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }
    // validation
    const errors = []
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid!' })
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Content is invalid!' })
    }
    if (errors.length > 0) {
      const error = new Error('Invalid Input!')
      error.data = errors
      error.code = 422
      throw error
    }

    const user = await User.findById(req.userId)
    if (!user) {
      const error = new Error("Can't find user")
      error.code = 401
      throw error
    }

    const post = new Post({
      title: postInput.title,
      content: postInput.content,
      imageUrl: postInput.imageUrl,
      creator: user,
    })
    const createdPost = await post.save()
    user.posts.push(post)
    await user.save()

    return {
      ...createdPost._doc,
      _id: createdPost._id.toString(),
      createdAt: createdPost.createdAt.toISOString(),
      updatedAt: createdPost.updatedAt.toISOString(),
    }
  },

  getPosts: async function ({ page }, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }

    if (!page) {
      page = 1
    }
    const perPage = 2
    const totalItems = await Post.find().countDocuments()
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)

    return {
      posts: posts.map((post) => ({
        ...post._doc,
        _id: post._id.toString(),
        createdAt: post.createdAt.toISOString(),
        updatedAt: post.updatedAt.toISOString(),
      })),
      totalPosts: totalItems,
    }
  },

  getPostById: async function ({ postId }, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }

    const post = await Post.findById(postId).populate('creator')
    if (!post) {
      const error = new Error('Could not find post.')
      error.code = 401
      throw error
    }

    return {
      ...post._doc,
      _id: post._id.toString(),
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    }
  },

  updatePost: async function ({ id, postInput }, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }

    const post = await Post.findById(id).populate('creator')
    if (!post) {
      const error = new Error('Could not find post.')
      error.code = 401
      throw error
    }

    if (post.creator._id.toString() !== req.userId.toString()) {
      const error = new Error('Not Authorization!')
      error.statusCode = 403
      throw error
    }

    // validation
    const errors = []
    if (
      validator.isEmpty(postInput.title) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Title is invalid!' })
    }
    if (
      validator.isEmpty(postInput.content) ||
      !validator.isLength(postInput.title, { min: 5 })
    ) {
      errors.push({ message: 'Content is invalid!' })
    }
    if (errors.length > 0) {
      const error = new Error('Invalid Input!')
      error.data = errors
      error.code = 422
      throw error
    }

    post.title = postInput.title
    post.content = postInput.content
    if (postInput.imageUrl !== 'undefined') {
      post.imageUrl = postInput.imageUrl
    }
    const updatedPost = await post.save()

    return {
      ...updatedPost._doc,
      _id: updatedPost._id.toString(),
      createdAt: updatedPost.createdAt.toISOString(),
      updatedAt: updatedPost.updatedAt.toISOString(),
    }
  },

  deletePost: async function ({ id }, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }

    const post = await Post.findById(id)
    if (!post) {
      const error = new Error('Could not find post.')
      error.code = 401
      throw error
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('No Authorization!')
      error.statusCode = 403
      throw error
    }

    clearImage(post.imageUrl)
    await Post.findByIdAndDelete(id)

    const user = await User.findById(req.userId)
    user.posts.pull(id)
    await user.save()

    return true
  },

  user: async function (args, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }

    const user = await User.findById(req.userId)
    if (!user) {
      const error = new Error('User with this email could not be found.')
      error.statusCode = 404
      throw error
    }

    return { ...user._doc, id: user._id.toString() }
  },

  updateStatus: async function ({ status }, req) {
    // is user logged in
    if (!req.isAuth) {
      const error = new Error('Not Authenticated!')
      error.code = 401
      throw error
    }

    const user = await User.findById(req.userId)
    if (!user) {
      const error = new Error('User with this email could not be found.')
      error.statusCode = 401
      throw error
    }

    user.status = status

    const updatedUser = await user.save()

    return { ...updatedUser._doc, id: updatedUser._id.toString() }
  },
}
