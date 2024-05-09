const { validationResult } = require('express-validator')
const Post = require('../models/post')
const User = require('../models/user')
const fs = require('fs')
const io = require('../socket')

const create422Error = (text) => {
  const error = new Error(text)
  error.statusCode = 422
  throw error
}

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId)
    if (!user) {
      const error = new Error('User with this email could not be found.')
      error.statusCode = 404
      throw error
    }

    res.status(200).json({ message: 'Status loaded!', status: user.status })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.updateStatus = async (req, res, next) => {
  const newStatus = req.body.status

  try {
    const user = await User.findById(req.userId)
    if (!user) {
      const error = new Error('User with this email could not be found.')
      error.statusCode = 401
      throw error
    }

    user.status = newStatus

    const updatedUser = await user.save()
    res
      .status(200)
      .json({ message: 'Status updated!', status: updatedUser.status })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1
  const perPage = 2

  try {
    const totalItems = await Post.find().countDocuments()
    const posts = await Post.find()
      .populate('creator')
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage)

    res.status(200).json({
      message: 'Posts fetched!',
      posts,
      totalItems,
    })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.createPost = async (req, res, next) => {
  const title = req.body.title
  const content = req.body.content
  let creator

  const error = validationResult(req)
  if (!error.isEmpty()) {
    create422Error('Validation failed. Entered data is incorrect.')
  }
  if (!req.file) {
    create422Error('No image provided.')
  }

  const imageUrl = req.file.path

  const post = new Post({
    title,
    content,
    creator: req.userId,
    imageUrl: imageUrl,
  })

  try {
    await post.save()
    const user = await User.findById(req.userId)

    creator = user
    user.posts.push(post)

    await user.save()

    io.getIO().emit('posts', {
      action: 'create',
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    })

    res.status(201).json({
      message: 'Success!',
      post: post,
      creator: { _id: creator._id, name: creator.name },
    })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId

  try {
    const post = await Post.findById(postId).populate('creator')
    if (!post) {
      create422Error('Could not find post.')
    }
    res.status(200).json({ message: 'Post fetched!', post })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId

  const error = validationResult(req)
  if (!error.isEmpty()) {
    create422Error('Validation failed. Entered data is incorrect.')
  }

  const title = req.body.title
  const content = req.body.content
  let imageUrl = req.body.image

  if (req.file) {
    imageUrl = req.file.path
  }

  if (!imageUrl) {
    create422Error('No file picked')
  }

  try {
    const post = await Post.findById(postId).populate('creator')
    if (!post) {
      create422Error('Could not find post.')
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error('Not Authorization!')
      error.statusCode = 403
      throw error
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl)
    }
    post.title = title
    post.content = content
    post.imageUrl = imageUrl
    const updatedPost = await post.save()

    io.getIO().emit('posts', { action: 'update', post: updatedPost })
    res.status(200).json({ message: 'Post updated!', post: updatedPost })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId

  try {
    const post = await Post.findById(postId)
    if (!post) {
      create422Error('Could not find post.')
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error('Not Authorization!')
      error.statusCode = 403
      throw error
    }
    clearImage(post.imageUrl)

    await Post.findByIdAndDelete(postId)

    const user = await User.findById(req.userId)
    user.posts.pull(postId)
    await user.save()

    io.getIO().emit('posts', { action: 'delete', post: postId })

    res.status(200).json({ message: 'Post deleted!' })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

const clearImage = (filePath) => {
  fs.unlink(filePath, (err) => console.log(err))
}
