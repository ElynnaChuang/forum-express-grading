const { Category } = require('../models')

const categoryController = {
  getCategories: async (req, res, next) => {
    const { id } = req.params // 如果有的話會進入編輯模式
    try {
      const categories = await Category.findAll({ raw: true })
      const category = id ? await Category.findByPk(id, { raw: true }) : null
      res.render('admin/categories', { categories, category })
    } catch (err) {
      next(err)
    }
  },
  postCategory: async (req, res, next) => {
    const name = req.body.name.trim()
    try {
      const [category, created] = await Category.findOrCreate({
        where: { name },
        default: { name },
        raw: true
      })
      if (!created) throw new Error('此分類已存在！')
      req.flash('success_messages', `成功新增分類：${category.name}`)
      res.redirect('/admin/categories')
    } catch (err) {
      next(err)
    }
  },
  putCategory: async (req, res, next) => {
    const { id } = req.params
    const { name } = req.body
    try {
      const [result] = await Category.update({ name }, { where: { id } })
      if (!result) throw new Error('此分類不存在') // 更新失敗
      req.flash('success_messages', '成功更新分類') // 更新成功
      res.redirect('/admin/categories')
    } catch (err) {
      next(err)
    }
  },
  deleteCategory: async (req, res, next) => {
    const { id } = req.params
    try {
      const result = await Category.destroy({
        where: { id }
      })
      if (!result) throw new Error('此分類不存在') // 刪除失敗
      req.flash('success_messages', '成功刪除分類') // 刪除成功
      res.redirect('/admin/categories')
    } catch (err) {
      next(err)
    }
  }
}
module.exports = categoryController
