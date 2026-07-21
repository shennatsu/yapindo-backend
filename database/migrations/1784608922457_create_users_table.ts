import { BaseSchema } from '@adonisjs/lucid/schema'
import { USER_ROLES } from '#enums/user_role'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('name').notNullable()
      table.string('email', 254).notNullable().unique()
      table.string('password', 180).notNullable()
      table
        .enum('role', [...USER_ROLES], { useNative: false, enumName: 'users_role_enum' })
        .notNullable()
        .defaultTo('user')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
