import { BaseSchema } from '@adonisjs/lucid/schema'
import { TASK_STATUSES } from '#enums/task_status'
import { TASK_PRIORITIES } from '#enums/task_priority'

export default class extends BaseSchema {
  protected tableName = 'tasks'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table
        .integer('project_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('projects')
        .onDelete('CASCADE')

      table.string('title').notNullable()
      table.text('description').notNullable()

      table
        .enum('status', [...TASK_STATUSES], { useNative: false, enumName: 'tasks_status_enum' })
        .notNullable()
        .defaultTo('todo')

      table
        .enum('priority', [...TASK_PRIORITIES], {
          useNative: false,
          enumName: 'tasks_priority_enum',
        })
        .notNullable()
        .defaultTo('medium')

      table
        .integer('assignee_id')
        .unsigned()
        .nullable()
        .references('id')
        .inTable('users')
        .onDelete('SET NULL')

      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
