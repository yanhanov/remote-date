import { createRouter, createWebHistory } from 'vue-router'
import { toast } from 'vue-sonner'
import {
  HomePage,
  AboutPage,
  RoomPage,
  SoundRoomPage,
  YoutubePage,
  SoundcloudPage,
  AuthPage,
  ProfilePage,
  UserProfilePage,
  FriendsPage,
  MessagesPage,
} from '@/pages'
import { DefaultLayout, AuthLayout } from '@/app/layout'
import { authStore } from '@/entities/user'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      children: [
        { path: '', component: HomePage },
        { path: 'about', component: AboutPage },
        { path: 'youtube', component: YoutubePage },
        { path: 'soundcloud', component: SoundcloudPage },
        { path: 'room/:id', component: RoomPage },
        { path: 'sound-room/:id', component: SoundRoomPage },
        { path: 'profile', component: ProfilePage },
        { path: 'users/:id', component: UserProfilePage },
        { path: 'friends', component: FriendsPage },
        { path: 'messages', component: MessagesPage },
        { path: 'messages/:userId', component: MessagesPage },
      ],
    },
    {
      path: '/auth',
      component: AuthLayout,
      children: [{ path: '', component: AuthPage }],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  // Для страниц авторизации доступ всегда открыт
  if (to.path.startsWith('/auth')) {
    return next()
  }

  // Инициализируем store и проверяем авторизацию
  const isAuthenticated = await authStore.initialize()

  if (!isAuthenticated) {
    toast.info('Please log in to continue')
    return next('/auth')
  }

  return next()
})

export default router
