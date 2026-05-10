import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
  { path: '/session', name: 'create-session', component: () => import('@/views/CreateSessionView.vue') },
  { path: '/session/:id', name: 'room', component: () => import('@/views/RoomView.vue'), props: true },
  { path: '/:catchAll(.*)', redirect: '/' },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
