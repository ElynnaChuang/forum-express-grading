'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    static associate (models) {
      Comment.belongsTo(models.User, { foreignKey: 'userId' })
      Comment.belongsTo(models.Restaurant, { foreignKey: 'restaurantId' })
    }
  };
  Comment.init({
    text: DataTypes.STRING,
    userId: DataTypes.UUID,
    restaurantId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Comment',
    tableName: 'Comments',
    underscored: true
  })
  return Comment
}
