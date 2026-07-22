import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Task from '#models/task'
import Project from '#models/project'
import User from '#models/user'

export default class extends BaseSeeder {
  /**
   * Tasks spread across both seeded projects, deliberately varied in
   * status/priority/assignee (including one unassigned task) so every
   * filter and the AI Command endpoint have real, varied data to act
   * on immediately after `db:seed` — no manual setup needed before
   * testing POST /ai/command or GET /projects/:id/tasks.
   *
   * Runs after 02_project_seeder — see that file's note on ordering.
   */
  async run() {
    const websiteProject = await Project.findByOrFail('name', 'Website Revamp')
    const mobileProject = await Project.findByOrFail('name', 'Mobile App Launch')
    const budi = await User.findByOrFail('email', 'budi@yapindo.test')
    const citra = await User.findByOrFail('email', 'citra@yapindo.test')

    await Task.updateOrCreateMany(
      ['projectId', 'title'],
      [
        {
          projectId: websiteProject.id,
          title: 'Fix Login Bug',
          description: 'Pengguna tidak bisa login setelah reset password.',
          status: 'in_progress',
          priority: 'high',
          assigneeId: budi.id,
        },
        {
          projectId: websiteProject.id,
          title: 'Setup CI/CD pipeline',
          description: 'Konfigurasi pipeline deploy otomatis ke staging.',
          status: 'todo',
          priority: 'medium',
          assigneeId: citra.id,
        },
        {
          projectId: mobileProject.id,
          title: 'Design onboarding screens',
          description: 'Buat wireframe untuk alur onboarding pengguna baru.',
          status: 'done',
          priority: 'medium',
          assigneeId: citra.id,
        },
        {
          projectId: mobileProject.id,
          title: 'Integrate push notifications',
          description: 'Tambahkan dukungan push notification untuk task reminder.',
          status: 'todo',
          priority: 'low',
          assigneeId: null,
        },
        {
          projectId: websiteProject.id,
          title: 'Optimize database queries',
          description: 'Cek slow query di halaman dashboard.',
          status: 'todo',
          priority: 'high',
          assigneeId: budi.id,
        },
      ]
    )
  }
}
