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

const AuthController = () => import('#controllers/auth_controller')

router.post('/register', [AuthController, 'register'])
