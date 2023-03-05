const { Restaurant, User, Comment } = require('../models')

module.exports = {
  postComment: async (req, res, next) => {
    const { restaurantId, text } = req.body
    const userId = req.user.id
    try {
      const user = await User.findByPk(userId)
      const restaurant = await Restaurant.findByPk(restaurantId)
      const comment = await Comment.create({ userId, restaurantId, text })
      if (!user || !restaurant) throw new Error('使用者或餐廳不存在')
      if (!comment) throw new Error('評論失敗，請重新整理畫面')
      req.flash('success_messages', '評論成功')
      res.redirect(`/restaurants/${restaurantId}`)
    } catch (err) {
      next(err)
    }
  },
  deleteComment: async (req, res, next) => {
    const { id } = req.params
    try {
      const comment = await Comment.findByPk(id)
      if (!comment) throw new Error('此評論不存在')
      await comment.destroy()
      req.flash('success_messages', '成功刪除評論')
      res.redirect(`/restaurants/${comment.restaurantId}`)
    } catch (err) {
      next(err)
    }
  }
}
