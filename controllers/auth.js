const User = require('../models/user')
const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = async (req, res, next) => {
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

  try {
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = new User({
      email: email,
      password: hashedPassword,
      name: name,
    })
    const savedUser = await user.save()
    res.status(201).json({ message: 'User created', userId: savedUser._id })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}

exports.login = async (req, res, next) => {
  const email = req.body.email
  const password = req.body.password

  try {
    const userData = await User.findOne({ email: email })
    if (!userData) {
      const error = new Error('User with this email could not be found.')
      error.statusCode = 401
      throw error
    }

    const isEqual = await bcrypt.compare(password, userData.password)
    if (!isEqual) {
      const error = new Error('Wrong password.')
      error.statusCode = 401
      throw error
    }

    const token = jwt.sign(
      {
        email: userData.email,
        userId: userData._id.toString(),
      },
      'someveryverylongandsecretstring',
      { expiresIn: '1h' }
    )

    res.status(200).json({ token, userId: userData._id.toString() })
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500
    }
    next(error)
  }
}
