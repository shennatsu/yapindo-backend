/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'

router.get('/health', () => {
  return {
    status: 'ok',
    service: 'yapindo-task-management-api',
  }
})

import { middleware } from '#start/kernel'
const AuthController = () => import('#controllers/auth_controller')
const ProjectsController = () => import('#controllers/projects_controller')

router.post('/register', [AuthController, 'register'])
router.post('/login', [AuthController, 'login'])

router.get('/projects', [ProjectsController, 'index']).use([middleware.auth()])
router.get('/projects/:id', [ProjectsController, 'show']).use([middleware.auth()])
router
  .post('/projects', [ProjectsController, 'store'])
  .use([middleware.auth(), middleware.role(['admin'])])
router
  .put('/projects/:id', [ProjectsController, 'update'])
  .use([middleware.auth(), middleware.role(['admin'])])
router
  .delete('/projects/:id', [ProjectsController, 'destroy'])
  .use([middleware.auth(), middleware.role(['admin'])])
