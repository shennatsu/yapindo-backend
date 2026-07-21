import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'audit_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')

      table.string('action').notNullable()
      table.jsonb('request_payload').notNullable()
      table.jsonb('response_payload').nullable()
      table
        .enum('status', ['success', 'failed'], {
          useNative: false,
          enumName: 'audit_logs_status_enum',
        })
        .notNullable()
      table.text('failed_reason').nullable()

      table.timestamp('created_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
