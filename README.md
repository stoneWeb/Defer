Defer 异步流程控制
===

[Promise/A+](http://promises-aplus.github.io/promises-spec/)实现

## 用法

```js
var promise = function(){
        var deferred = new Defer;
        setTimeout(function(){
            var rand = Math.random() > .5;
            if(rand){
                deferred.resolve('ok');
            }else{
                deferred.reject('error');
            }
        }, 0);
        return deferred.promise;
    }
promise.then(function(data){
    console.log(data);
},function(err){
    console.log(err);
});
```

## API

#### otherwise(fn)

otherwise 等于 then 函数只传reject
```js
var promise = Defer.promise(function(resolve, reject){
        setTimeout(function(){
            Math.random() > .5 ? resolve('ok') : reject('error');
        }, 0);
    });
    promise.then(function(data){
        console.log(data);
    }).otherwise(function(err){
        console.log(err);
    })
```

#### promise(fn)

静态方法promise接受一个函数作为参数，该函数得到两个参数分别是resolve，reject两个函数，用于改变promise的状态
```js
var promise = Defer.promise(function(resolve, reject){
        setTimeout(function(){
            Math.random() > .5 ? resolve('ok') : reject('error');
        }, 0);
    });
    promise.then(function(data){
        console.log(data);
    },function(err){
        console.log(err);
    })
```

#### resolve(data), reject(reason)
这两个方法用于把现有对象转为promise对象
```js
var promise = Defer.resolve('ok');
    promise.then(function(data){
        console.log(data);
    })
```
#### all(promises)
多个promise对象包成一个promise对象
```js
Defer.all(promise1(), promise2()).then(function(promise1arg, promise2arg){
        console.log(arguments);
    }, function(){
        console.log(arguments);
    })
```
