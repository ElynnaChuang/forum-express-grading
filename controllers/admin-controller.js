// 後台專用
// const { sequelize } = require('../models')
// const { QueryTypes } = require('sequelize')
const { Restaurant, User, Category } = require('../models')
const { removesWhitespace } = require('../helpers/object-helpers')
const { imgurFileHandler } = require('../helpers/file-helpers')
const { nullCategoryHandle } = require('../helpers/object-helpers')

const adminController = {
  getRestaurants: async (req, res, next) => {
    req.session.pathFrom = 'restaurants'
    try {
      const restsData = await Restaurant.findAll({
        include: [{ model: Category, attributes: ['name'] }],
        attributes: ['id', 'name'],
        raw: true,
        nest: true
      })
      const restaurants = nullCategoryHandle(restsData)
      res.render('admin/restaurants', { restaurants })
    } catch (err) {
      next(err)
    }
  },
  createRestaurantPage: async (req, res, next) => {
    try {
      const categories = await Category.findAll({
        raw: true,
        attributes: ['id', 'name']
      })
      res.render('admin/create-restaurant', { categories })
    } catch (err) {
      next(err)
    }
  },
  createRestaurant: async (req, res, next) => {
    try {
      const restData = removesWhitespace(req.body)
      if (!restData.name) throw new Error('餐廳名稱為必填')
      const imgPath = await imgurFileHandler(req.file)
      const restaurant = await Restaurant.create({ ...restData, image: imgPath })
      req.flash('success_messages', `成功新增餐廳：${restaurant.name}`)
      res.redirect('/admin/restaurants')
    } catch (err) {
      next(err)
    }
  },
  getRestaurantDetail: async (req, res, next) => {
    const id = req.params.id
    req.session.pathFrom = `restaurants/${id}`
    try {
      const restData = await Restaurant.findByPk(id, {
        raw: true,
        nest: true,
        include: [{ model: Category, attributes: ['name'] }]
      })
      const restaurant = nullCategoryHandle(restData)
      res.render('admin/restaurant-detail', { restaurant })
    } catch (err) {
      next(err)
    }
  },
  editRestaurantPage: async (req, res, next) => {
    const { id } = req.params
    try {
      const [restaurant, categories] = await Promise.all([
        Restaurant.findByPk(id, { raw: true }),
        Category.findAll({ raw: true })
      ])
      res.render('admin/edit-restaurant', { restaurant, categories })
    } catch (err) {
      next(err)
    }
  },
  patchRestaurant: async (req, res, next) => {
    const { id } = req.params
    const { pathFrom } = req.session // 利用這個紀錄是從 detail頁面進入編輯 or restaurants 頁面
    try {
      const restaurant = removesWhitespace(req.body)
      if (!restaurant.name) throw new Error('餐廳名稱為必填')
      const imgPath = await imgurFileHandler(req.file)
      await Restaurant.update({ ...restaurant, image: imgPath || req.body.image }, { where: { id } })
      req.flash('success_messages', '成功修改餐廳')
      res.redirect(`/admin/${pathFrom}`)
    } catch (err) {
      next(err)
    }
  },
  deleteRestaurant: async (req, res, next) => {
    const { id } = req.params
    try {
      const restaurant = await Restaurant.destroy({ where: { id } })
      if (!restaurant) throw new Error('此餐廳不存在')
      req.flash('success_messages', '成功刪除餐廳')
      res.redirect('/admin/restaurants')
    } catch (err) {
      next(err)
    }
  },
  getUsers: async (req, res, next) => {
    try {
      const users = await User.findAll({
        raw: true,
        attributes: ['id', 'name', 'email', 'isAdmin'],
        order: [['isAdmin', 'DESC'], ['createdAt', 'ASC']]
      })
      res.render('admin/users', { users })
    } catch (err) {
      next(err)
    }
  },
  patchUser: async (req, res, next) => {
    const { id } = req.params
    try {
      const user = await User.findByPk(id)
      if (user.email === 'root@example.com') {
        req.flash('error_messages', '禁止變更 root 權限')
        return res.redirect('back')
      }
      await user.update({ isAdmin: !user.isAdmin })
      req.flash('success_messages', '使用者權限變更成功')
      res.redirect('/admin/users')
    } catch (err) {
      next(err)
    }
  }
}
module.exports = adminController
