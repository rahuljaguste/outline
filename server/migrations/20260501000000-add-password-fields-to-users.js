"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("users", "passwordHash", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "passwordUpdatedAt", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("users", "passwordUpdatedAt");
    await queryInterface.removeColumn("users", "passwordHash");
  },
};
