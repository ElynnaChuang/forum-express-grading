'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Like extends Model {
    static associate (models) {

    }
  };
  Like.init({
    userId: DataTypes.UUID,
    restaurantId: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'Like',
    tableName: 'Likes',
    underscored: true
  })
  return Like
}
