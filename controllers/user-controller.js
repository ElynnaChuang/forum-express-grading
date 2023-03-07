const Sequelize = require('sequelize')
const passport = require('passport')
const { v4: uuidv4 } = require('uuid')
const { User, Comment, Restaurant, Favorite, Like, Followship } = require('../models')
const { removesWhitespace } = require('../helpers/object-helpers')
const { imgurFileHandler } = require('../helpers/file-helpers')
const { getUser } = require('../helpers/auth-helpers')
const bcrypt = require('bcryptjs')

const userController = {
  signUpPage: (req, res) => {
    res.render('signup', { name: req.flash('name'), email: req.flash('email') })
  },
  signUp: (req, res, next) => {
    const { name, email, password, confirmPassword } = removesWhitespace(req.body)
    if (!email || !password || !confirmPassword) throw new Error('必填欄位尚未填寫')
    if (password !== confirmPassword) throw new Error('確認密碼輸入的密碼與不一致')
    return User.findOrCreate({
      where: { email },
      defaults: { id: uuidv4(), name, email, password: bcrypt.hashSync(password, 10) }
    })
      .then(([user, created]) => {
        if (!created) return console.log('Email is already existed!')
        req.flash('success_messages', '註冊成功')
        res.redirect('/signin')
      })
      .catch(err => next(err, req))
  },
  signInPage: (req, res) => {
    res.render('signin')
  },
  signIn: passport.authenticate('local', {
    failureRedirect: '/signin',
    successRedirect: '/restaurants'
  }),
  logOut: (req, res, next) => {
    req.flash('success_messages', '登出成功！')
    req.logout()
    res.redirect('/signin')
  },
  getUser: async (req, res, next) => {
    const userId = req.params.id
    const loggedUser = getUser(req)
    try {
      const userData = await User.findByPk(userId, {
        include: [
          { model: User, as: 'Followers', attributes: ['id', 'image'] },
          { model: User, as: 'Followings', attributes: ['id', 'image'] },
          { model: Restaurant, as: 'FavoritedRestaurants', attributes: ['id', 'image'] },
          { model: Restaurant, as: 'LikedRestaurants', attributes: ['id', 'image'] }
        ]
      })
      if (!userData) throw new Error('使用者不存在')
      const comments = await Comment.findAll({
        where: { userId },
        include: [
          { model: Restaurant, attributes: ['image'] }
        ],
        attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('restaurant_id')), 'restaurantId']],
        nest: true,
        raw: true
      })
      const user = {
        ...userData.toJSON(),
        canFollowed: loggedUser.id !== userId,
        isFollowed: loggedUser.Followings.some(following => following.id === userId)
      }
      res.render('users/profile', { user, comments })
    } catch (err) {
      next(err)
    }
  },
  editUser: async (req, res, next) => {
    const loggedUserId = getUser(req).id
    const { id } = req.params
    try {
      if (loggedUserId !== id) throw new Error('無編輯權限')
      const user = await User.findByPk(id, { raw: true })
      if (!user) throw new Error('使用者不存在')
      res.render('users/edit', { user })
    } catch (err) {
      next(err)
    }
  },
  putUser: async (req, res, next) => {
    const loggedUserId = req.user.id
    const { id } = req.params
    try {
      if (loggedUserId !== id) throw new Error('無編輯權限')
      const user = await User.findByPk(id)
      if (!user) throw new Error('使用者不存在，更新失敗')

      const { name } = req.body
      const image = await imgurFileHandler(req.file) || user.image
      await user.update({ name, image })
    } catch (err) {
      next(err)
    }
    req.flash('success_messages', '使用者資料編輯成功')
    res.redirect(`/users/${id}`)
  },
  addFavorite: async (req, res, next) => {
    const { restaurantId } = req.params
    const userId = req.user.id
    try {
      const [restaurant, favorite] = await Promise.all([
        Restaurant.findByPk(restaurantId),
        Favorite.findOne({ where: { restaurantId, userId } })
      ])
      if (!restaurant) throw new Error('此餐廳不存在')
      if (favorite) throw new Error('已經收藏過此餐廳了')
      const created = await Favorite.create({ restaurantId, userId })
      if (created) res.redirect('back')
    } catch (err) {
      next(err)
    }
  },
  removeFavorite: async (req, res, next) => {
    const { restaurantId } = req.params
    const userId = req.user.id
    try {
      const favorite = await Favorite.findOne({ where: { restaurantId, userId } })
      if (!favorite) throw new Error('尚未收藏此餐廳了')
      await favorite.destroy()
      res.redirect('back')
    } catch (err) {
      next(err)
    }
  },
  addLike: async (req, res, next) => {
    const { restaurantId } = req.params
    const userId = req.user.id
    try {
      const [restaurant, like] = await Promise.all([
        Restaurant.findByPk(restaurantId),
        Like.findOne({ where: { restaurantId, userId } })
      ])
      if (!restaurant) throw new Error('此餐廳不存在')
      if (like) throw new Error('已經讚過此餐廳了')
      const created = await Like.create({ restaurantId, userId })
      if (created) res.redirect('back')
    } catch (err) {
      next(err)
    }
  },
  removeLike: async (req, res, next) => {
    const { restaurantId } = req.params
    const userId = req.user.id
    try {
      const restaurant = await Restaurant.findByPk(restaurantId)
      if (!restaurant) throw new Error('此餐廳不存在')
      const removed = await Like.destroy({ where: { restaurantId, userId } })
      if (!removed) throw new Error('已經取消過讚了')
      res.redirect('back')
    } catch (err) {
      next(err)
    }
  },
  getTopUsers: async (req, res, next) => {
    try {
      const usersData = await User.findAll({
        attributes: {
          include: [
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM followships AS followship
              WHERE followship.following_id = user.id
            )`),
            'followerCount'
            ]
          ]
        },
        order: [
          [Sequelize.literal('followerCount'), 'DESC']
        ],
        limit: 10
      })
      const users = usersData.map(user => ({
        ...user.toJSON(),
        canFollowed: user.id !== req.user.id, // 讓hbs決定要不要顯示追蹤按鈕
        isFollowed: req.user.Followings.some(f => f.id === user.id) // = user.Followers.some(f => f.id === req.user.id) (從我追的人裡找是否有此user = 從此user的追蹤者找是否有我)
      }))
      res.render('top-users', { users })
    } catch (err) {
      next(err)
    }
  },
  addFollowing: async (req, res, next) => {
    const followerId = req.user.id
    const followingId = req.params.userId
    try {
      const [user, followship] = await Promise.all([
        User.findByPk(followingId),
        Followship.findOne({
          where: { followerId, followingId }
        })
      ])
      if (!user) throw new Error('該使用者不存在')
      if (followship) throw new Error('已經追蹤過使用者了')
      await Followship.create({ followerId, followingId })
    } catch (err) {
      next(err)
    }
    res.redirect('back')
  },
  removeFollowing: async (req, res, next) => {
    const followerId = req.user.id
    const followingId = req.params.userId
    try {
      const user = await User.findByPk(followingId)
      if (!user) throw new Error('該使用者不存在')
      const removed = await Followship.destroy({
        where: { followerId, followingId }
      })
      if (!removed) throw new Error('已取消追蹤過該使用者')
      res.redirect('back')
    } catch (err) {
      next(err)
    }
  }
}

module.exports = userController
