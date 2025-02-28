// 前台使用者用
const Sequelize = require('sequelize')
const { Restaurant, Category, Comment, User } = require('../models')
const { nullCategoryHandle, descriptionCut } = require('../helpers/object-helpers')
const { getOffset, getPagination } = require('../helpers/pagination-helper')

const restaurantController = {
  getRestaurants: async (req, res, next) => {
    const DEFAULT_LIMIT = 6
    const page = Number(req.query.page) || 1 // 當前頁數(剛登入會是NaN所以要補 1)
    const limit = Number(req.query.limit) || DEFAULT_LIMIT // restaurant per page
    const limitOption = [DEFAULT_LIMIT, 12, 24] // 產出 limit 選項
    const offset = getOffset(limit, page)
    const categoryId = (req.query.categoryId || req.query.categoryId === '0') ? Number(req.query.categoryId) : '' // 不能只寫(req.query.categoryId) 因為 categoryId=0 也要轉number
    try {
      const [restData, categories] = await Promise.all([
        Restaurant.findAndCountAll({
          where: categoryId ? { categoryId } : categoryId === 0 ? { categoryId: null } : {},
          include: [{ model: Category, attributes: ['name'] }],
          raw: true,
          nest: true,
          limit,
          offset
        }),
        Category.findAll({ raw: true })
      ])
      const pagination = getPagination(restData.count, limit, page)
      const favoritedRestaurantsId = req.user && req.user.FavoritedRestaurants.map(fr => fr.id)
      const likedRestaurantsId = req.user && req.user.LikedRestaurants.map(lr => lr.id)

      const restaurants = restData.rows.map(r => ({
        ...r,
        isFavorite: favoritedRestaurantsId.includes(r.id),
        isLike: likedRestaurantsId.includes(r.id),
        categoryId: r.categoryId || 0,
        Category: { name: r.Category.name || '未分類' }
      }))
      res.render('restaurants', { restaurants, categories, categoryId, pagination, limit, limitOption })
    } catch (err) {
      next(err)
    }
  },
  getRestaurant: async (req, res, next) => {
    const { id } = req.params
    try {
      const data = await Restaurant.findByPk(id, {
        include: [
          { model: Category, attributes: ['name'] },
          {
            model: Comment,
            include: { model: User, attributes: ['id', 'name'] }
          },
          { model: User, as: 'FavoritedUsers' },
          { model: User, as: 'LikedUsers' }
        ],
        order: [
          [Comment, 'createdAt', 'DESC']
        ]
      })
      if (!data) throw new Error('此餐廳不存在')
      await data.increment('view_counts')
      const restaurant = nullCategoryHandle(data.toJSON())
      const isFavorite = restaurant.FavoritedUsers.some(user => user.id === req.user.id) // 迭代時只要找到一個符合條件，就會立刻回傳 true，後面的項目不會繼續執行
      const isLike = restaurant.LikedUsers.some(user => user.id === req.user.id)
      res.render('restaurant', { restaurant, isFavorite, isLike })
    } catch (err) {
      next(err)
    }
  },
  getDashboard: async (req, res, next) => {
    const { id } = req.params
    try {
      const restaurant = await Restaurant.findByPk(id, {
        raw: true,
        nest: true,
        include: { model: Category, attributes: ['name'] }
      })
      res.render('dashboard', { restaurant })
    } catch (err) {
      next(err)
    }
  },
  getFeeds: async (req, res, next) => {
    const limit = 10
    const order = [['createdAt', 'DESC']]
    const [restData, commentData] = await Promise.all([
      Restaurant.findAll({
        limit,
        order,
        include: { model: Category, attributes: ['name'] },
        raw: true,
        nest: true
      }),
      Comment.findAll({
        limit,
        order,
        include: [
          { model: User, attributes: ['id', 'name'] },
          {
            model: Restaurant,
            attributes: ['id', 'name', 'image'],
            include: { model: Category, attributes: ['name'] }
          }
        ],
        raw: true,
        nest: true
      })
    ])
    const restaurants = descriptionCut(restData)
    const comments = descriptionCut(commentData)
    res.render('feeds', { restaurants, comments })
  },
  getTopRestaurants: async (req, res, next) => {
    try {
      const restData = await Restaurant.findAll({
        include: [{ model: Category, attributes: ['name'] }],
        attributes: {
          include: [
            [Sequelize.literal(`(
              SELECT COUNT(*)
              FROM favorites AS favorite
              WHERE favorite.restaurant_id = restaurant.id
            )`),
            'favoritedCount'
            ]
          ]
        },
        order: [
          [Sequelize.literal('favoritedCount'), 'DESC'], ['id', 'ASC']
        ],
        raw: true,
        nest: true,
        limit: 10
      })
      const restaurants = restData.map(r => ({
        ...r,
        description: r.description.length >= 40 ? r.description.substring(0, 40) + '...' : r.description,
        isFavorite: req.user && req.user.FavoritedRestaurants.some(fr => fr.id === r.id)
      }))
      res.render('top-restaurants', { restaurants })
    } catch (err) {
      next(err)
    }
  }
}

module.exports = restaurantController
