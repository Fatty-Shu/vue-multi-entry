import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/page1/components/HelloWorld'

Vue.use(Router)

export default new Router({
  mode: 'history',
  base: '/',
  routes: [
    {
      path: '/page1/',
      redirect: '/page1/index'
    },
    {
      path: '/page1/index',
      name: 'HelloWorld',
      component: HelloWorld
    }
  ]
})
