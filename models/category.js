'use strict'
const {
  Model
} = require('sequelize')
module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate (models) {
      Category.hasMany(models.Restaurant, {
        foreignKey: 'categoryId',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      })
    }
  };
  Category.init({
    name: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Category',
    tableName: 'Categories',
    underscored: true
  })
  return Category
}
