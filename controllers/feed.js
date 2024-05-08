const { validationResult } = require('express-validator')
const Post = require('../models/post')
const User = require('../models/user')
const fs = require('fs')

const create422Error = (text) => {
  const error = new Error(text)
  error.statusCode = 422
  throw error
}

exports.getStatus = (req, res, next) => {
  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error('User with this email could not be found.')
        error.statusCode = 404
        throw error
      }

      res.status(200).json({ message: 'Status loaded!', status: user.status })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.updateStatus = (req, res, next) => {
  const newStatus = req.body.status

  User.findById(req.userId)
    .then((user) => {
      if (!user) {
        const error = new Error('User with this email could not be found.')
        error.statusCode = 401
        throw error
      }

      user.status = newStatus
      return user.save()
    })
    .then((result) => {
      res
        .status(200)
        .json({ message: 'Status updated!', status: result.status })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.getPosts = (req, res, next) => {
  const currentPage = req.query.page || 1
  const perPage = 2
  let totalItems
  Post.find()
    .countDocuments()
    .then((count) => {
      totalItems = count
      return Post.find()
        .skip((currentPage - 1) * perPage)
        .limit(perPage)
    })
    .then((posts) => {
      res.status(200).json({
        message: 'Posts fetched!',
        posts,
        totalItems,
      })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.createPost = (req, res, next) => {
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
  // Create post in DB
  const post = new Post({
    title,
    content,
    creator: req.userId,
    imageUrl: imageUrl,
  })
  post
    .save()
    .then((result) => {
      return User.findById(req.userId)
    })
    .then((user) => {
      creator = user
      user.posts.push(post)
      return user.save()
    })
    .then((result) => {
      res.status(201).json({
        message: 'Success!',
        post: post,
        creator: { _id: creator._id, name: creator.name },
      })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.getPost = (req, res, next) => {
  const postId = req.params.postId

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        create422Error('Could not find post.')
      }
      res.status(200).json({ message: 'Post fetched!', post })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.updatePost = (req, res, next) => {
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

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        create422Error('Could not find post.')
      }
      if (post.creator.toString() !== req.userId) {
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
      return post.save()
    })
    .then((result) => {
      return res.status(200).json({ message: 'Post updated!', post: result })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.deletePost = (req, res, next) => {
  const postId = req.params.postId

  Post.findById(postId)
    .then((post) => {
      if (!post) {
        create422Error('Could not find post.')
      }
      if (post.creator.toString() !== req.userId) {
        const error = new Error('Not Authorization!')
        error.statusCode = 403
        throw error
      }
      clearImage(post.imageUrl)

      return Post.findByIdAndDelete(postId)
    })
    .then((result) => {
      return User.findById(req.userId)
    })
    .then((user) => {
      user.posts.pull(postId)
      return user.save()
    })
    .then((result) => {
      return res.status(200).json({ message: 'Post deleted!' })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

const clearImage = (filePath) => {
  fs.unlink(filePath, (err) => console.log(err))
}
