公司使用`vue-cli`创建的`vue项目`在初始化时并没有做多页面配置，随着需求的不断增加，发现有必要使用多页面配置。看了很多`vue多页面配置`的文章，基本都是在初始化时就配置了多页面。而且如果使用这些实现，需要调整当前项目的目录结构，这点也是不能接受的。  
最后，参考这些文章，在不调整当前项目目录结构实现了多页面的配置的添加。这里做下记录、总结，方便以后复用。如果还能有幸帮助到有同样需求的童鞋的话，那就更好了。

###  实现步骤
1. 添加新增入口相关文件;
2. 使用变量维护多入口；
3. 开发环境读取多入口配置；
4. 生产环境读取多入口配置；

### 新增入口相关文件
在`src`目录下新增一个`page1`文件夹，新建新页面的所需的相关文件(入口文件、HTML模板文件等)。我这边直接`vue-cli`初始化创建相关文件复制了一份到`page1`文件夹下。如下：
```js
├─App.vue
├─main.js
├─page1.html // 这里模板文件名称需要与文件夹名称相同，方便输出模板读取
├─router
|   └index.js
├─components
|     └HelloWorld.vue
├─assets
|   └logo.png
```
`page1/router/index.js`需要对该页面的所有路由添加同文件夹名的公共路径，用于解析：
```js
import Vue from 'vue'
import Router from 'vue-router'
import HelloWorld from '@/page1/components/HelloWorld' // 这里也需要留意
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
```
### 使用变量维护多入口
我们在项目目录下的`build/utils.js`的最后`exports`一个指定多入口的对象。如下：
```js
// 这里，每个属性就是一个页面配置，指定该页面的入口文件
// 如果需要添加，只需多增加一个属性
// 属性名必和html模板文件名、目录名称相同
exports.multipleEntrys = {
  page1: './src/page1/main.js'
}
```
之所以使用`build/utils.js`，是因为该文件在`webpack.base.conf.js`、`webpack.prod.conf.js`、`webpack.dev.conf.js`都用导入。

### 开发环境读取多入口配置
首先，在`build/webpack.base.conf.js`中，我们把上面定义的入口添加进`entry`配置：
```js
  entry: {
    app: './src/main.js',
    ...utils.multipleEntrys  // entry添加该行
  }
```
然后，在`build/webpack.dev.conf.js`添加路径解析和多页面输出：
```js
// 添加解析，将historyApiFallback的属性修改如下：
    historyApiFallback: {
      rewrites: [
        // 将所有多入口遍历成路径解析项
        ...((()=>{
          let writes = []
          for(let prop in utils.multipleEntrys){
            // 使用属性名匹配为正则
            // 这就是上面“需要对该页面的所有路由添加同文件夹名的公共路径”的原因
            let reg = new RegExp(`^/${prop}/`) 
            writes.push({
              from: reg,
              // 使用属性名读取模板文件
              // 这就是上面“模板文件名称需要与文件夹名称相同”的原因
              to: path.posix.join(config.dev.assetsPublicPath, `${prop}.html`)
            })
          }
          return writes
        })()),
        // 匹配所有路径一定要在最后，否则该匹配之后的项，不会被执行
        { from: /.*/, to: path.posix.join(config.dev.assetsPublicPath, 'index.html') } 
      ],
    }
```
```js
// 在已经的HtmlWebpackPlugin中添加chunks配置，否则默认页面会注入所有页面的js文件
...
plugins: [
    ...
    new HtmlWebpackPlugin({
      filename: 'index.html',
      template: 'index.html',
      inject: true,
      // 增加此行，
      // 'app'为默认入口名称，如果你的默认入口不是'app'
      // 则这里需要替换
      chunks: ['manifest', 'vendor', 'app']
    })
    ...
]
...
// 在`devWebpackConfig`定义之后，紧接着添加多页面输出：
for(let prop in utils.multipleEntrys){
  devWebpackConfig.plugins.push(new HtmlWebpackPlugin({
    filename: `${prop}.html`,
    // html模板路径,使用属性名作为文件夹名称
    // 这是新页面文件夹名称需要和多入口配置变量属性名相同的原因
    template: `./src/${prop}/${prop}.html`, 
    inject: true,
    chunks: ['manifest', 'vendor', prop],
  }))
}
```
最后，添加多页面相互跳转链接：
```html
<!-- src/components/HelloWorld.vue -->
...
<a href="/page1/index" >to page B</a> 
...

<!-- src/page1/components/HelloWorld.vue -->
...
<a href="/" >to page A</a> 
...
<!-- 这里由于是多个页面的跳转，所以不能再使用router-link标签，需要使用a标签 -->
```
到这里，开发环境的多页面配置已经完成，重新`npm run dev`一下，即可多页面跳转。
### 生产环境读取多入口配置
首先，在`webapck.prod.config.js`中添加多页面输出。
```js
// 在已经的HtmlWebpackPlugin中添加chunks配置，否则默认页面会注入所有页面的js文件
...
plugins: [
    ...
    new HtmlWebpackPlugin({
      ...
      chunks: ['manifest', 'vendor', 'app'] // 增加此行
      ...
    })
    ...
]
...
// build/webapck.prod.config.js的webpackConfig定义后紧接着添加
for(let prop in utils.multipleEntrys){
  webpackConfig.plugins.push(new HtmlWebpackPlugin({
    filename: `${prop}.html`,
    template: `./src/${prop}/${prop}.html`,
    inject: true,
    chunks: ['manifest', 'vendor', prop],
    minify: {
      removeComments: true,
      collapseWhitespace: true,
      removeAttributeQuotes: true
    },
    chunksSortMode: 'dependency'
  }))
}
```
然后，开发环境不同路径指向不同输出文件是由`historyApiFallback`来处理的，生产就需要在`web服务`中将不同路径指向打包后的不同文件。这里以`nginx`为例，配置如下：
```js
server {
    listen       92 default_server;
    listen       [::]:92 default_server;
    server_name  _;
    root         D:\vue-multi-entry\dist;


   location / {
            try_files $uri $uri/ /index.html;
    }

    location /page1/ {
            try_files $uri $uri/ /page1.html;
    }
}
```
以上，整个多页面的配置就已经完成。这里是[完整demo](https://github.com/Fatty-Shu/vue-multi-entry)

### 关于webpack4.x版本的差异
如果你使用的是`webpack4.x`版本，关于`webapck.prod.config.js`中`chunks`配置的顺序就是这样的：`[prop, 'manifest', 'vendor']`。

