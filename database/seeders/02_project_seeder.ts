import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Project from '#models/project'
import User from '#models/user'

export default class extends BaseSeeder {
  /**
   * Two projects, both created by the seeded admin. Runs after
   * 01_user_seeder (the numeric filename prefix is what guarantees
   * that order — `db:seed` otherwise has no dependency awareness
   * between seeder files).
   */
  async run() {
    const admin = await User.findByOrFail('email', 'admin@yapindo.test')

    await Project.updateOrCreateMany('name', [
      {
        name: 'Website Revamp',
        description: 'Redesign dan migrasi website perusahaan ke stack baru.',
        createdBy: admin.id,
      },
      {
        name: 'Mobile App Launch',
        description: 'Persiapan rilis aplikasi mobile untuk pelanggan.',
        createdBy: admin.id,
      },
    ])
  }
}
