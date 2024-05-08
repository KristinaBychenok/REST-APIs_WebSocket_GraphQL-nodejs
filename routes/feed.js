const express = require('express')
const {
  getStatus,
  updateStatus,
  getPosts,
  createPost,
  getPost,
  updatePost,
  deletePost,
} = require('../controllers/feed')
const { body } = require('express-validator')
const isAuth = require('../middleware/is-auth')

const router = express.Router()

// GET => /feed/status
router.get('/status', isAuth, getStatus)
// PUT => /feed/status
router.put(
  '/status',
  isAuth,
  [body('status').trim().not().isEmpty()],
  updateStatus
)
// GET => /feed/posts
router.get('/posts', isAuth, getPosts)
// POST => /feed/post
router.post(
  '/post',
  isAuth,
  [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 }),
  ],
  createPost
)
// GET => /feed/post/postId
router.get('/post/:postId', isAuth, getPost)
// PUT => /feed/post/postId
router.put(
  '/post/:postId',
  isAuth,
  [
    body('title').trim().isLength({ min: 5 }),
    body('content').trim().isLength({ min: 5 }),
  ],
  updatePost
)
// DELETE => /feed/post/postId
router.delete('/post/:postId', isAuth, deletePost)

module.exports = router
