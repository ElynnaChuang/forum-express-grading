'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM Users;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    const restaurants = await queryInterface.sequelize.query(
      'SELECT id FROM Restaurants;',
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )
    const result = []
    for (const user of users) {
      const restsData = Array.from(restaurants)
      const count = Math.floor(Math.random() * 5) + 1
      for (let i = 0; i < count; i++) {
        const restIndex = Math.floor(Math.random() * restsData.length)
        result.push({
          user_id: user.id,
          restaurant_id: restsData[restIndex].id,
          created_at: new Date(),
          updated_at: new Date()
        })
        restsData.splice(restIndex, 1)
      }
    }
    await queryInterface.bulkInsert('Favorites', result)
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Favorites', {})
  }
}
