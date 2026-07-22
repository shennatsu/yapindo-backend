import { BaseSeeder } from '@adonisjs/lucid/seeders'
import User from '#models/user'

export default class extends BaseSeeder {
  /**
   * One admin and two regular users, covering both roles the spec
   * requires ("register as admin / user") so the API is testable
   * end-to-end without registering an account by hand first.
   *
   * Keyed on `email` via updateOrCreateMany so re-running the seeder
   * (e.g. after `migration:refresh`) never creates duplicate rows.
   */
  async run() {
    await User.updateOrCreateMany('email', [
      {
        name: 'Admin Yapindo',
        email: 'admin@yapindo.test',
        password: 'Password123!',
        role: 'admin',
      },
      {
        name: 'Budi Santoso',
        email: 'budi@yapindo.test',
        password: 'Password123!',
        role: 'user',
      },
      {
        name: 'Citra Wulandari',
        email: 'citra@yapindo.test',
        password: 'Password123!',
        role: 'user',
      },
    ])
  }
}
