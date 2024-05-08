const User = require('../models/user')
const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const error = new Error('Validation error!')
    error.statusCode = 422
    error.data = errors.array()
    throw error
  }

  const email = req.body.email
  const password = req.body.password
  const name = req.body.name

  bcrypt
    .hash(password, 12)
    .then((hashedPassword) => {
      const user = new User({
        email: email,
        password: hashedPassword,
        name: name,
      })
      return user.save()
    })
    .then((result) => {
      res.status(201).json({ message: 'User created', userId: result._id })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}

exports.login = (req, res, next) => {
  const email = req.body.email
  const password = req.body.password
  let loadedUser

  User.findOne({ email: email })
    .then((userData) => {
      if (!userData) {
        const error = new Error('User with this email could not be found.')
        error.statusCode = 401
        throw error
      }
      loadedUser = userData
      return bcrypt.compare(password, userData.password)
    })
    .then((isEqual) => {
      if (!isEqual) {
        const error = new Error('Wrong password.')
        error.statusCode = 401
        throw error
      }

      const token = jwt.sign(
        {
          email: loadedUser.email,
          userId: loadedUser._id.toString(),
        },
        'someveryverylongandsecretstring',
        { expiresIn: '1h' }
      )

      res.status(200).json({ token, userId: loadedUser._id.toString() })
    })
    .catch((error) => {
      if (!error.statusCode) {
        error.statusCode = 500
      }
      next(error)
    })
}
