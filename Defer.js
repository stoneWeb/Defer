(function(root, undefined){
    // 缓存 window document
    var win = window,
        doc = window.document,

	
    // object toString
    toString = Object.prototype.toString,

    
    // object hasOwnProperty
    hasOwn = Object.prototype.hasOwnProperty,

    
    // Array slice
    slice = Array.prototype.slice,

	/**
     * resolver的状态
     *
     * @type {Object}
     */
	STATUS = {
        PENDING: 0,
        FULFILLED: 1,
        REJECTED: 2
    },

    /**
     * promise对象的初始状态
     *
     * @type {Object}
     */
    initAttrs = {
        _status  : STATUS.PENDING,
        _resolves: [],
        _rejects : [],
        _data    : null,
        _reason  : null
    },

    /**
     * Function 判断
     *
     * @param {...} value
     * @return {boolean}
     */
    isFunction = function(obj){
        return typeof obj === 'function';
    },

    /**
     * Object 判断
     *
     * @param {...} value
     * @return {boolean}
     */
    isObject = function(obj){
    	return '[object Object]' === toString.call(obj) && !obj.nodeType;
    },

    /**
     * Array 判断
     *
     * @param {...} value
     * @return {boolean}
     */
    isArray = function(obj){
        return isFunction(Array.isArray) ? Array.isArray(obj) : '[object Array]' === toString.call(obj);
    },

    /**
     * 判断是否是promise对象
     *
     * @param {promise} value
     * @return {boolean}
     */
    isPromise = function(obj){
    	return isObject(obj) && isFunction(obj.then);
    },

    /**
     * 用于遍历数组
     *
     * @param {Array} value
     * @param {Function} value
     * @return {Array}
     */
    each = function(arr, callback){
        var i=0, len = arr.length, value;
        for(; i<len; i++){
            value = callback.call(arr[i], i, arr[i]);
            if(value === false){
                break;
            }
        }
        return arr;
    },

    /**
     * 对象copy
     *
     * @param {Object1} value
     * @param {Object2} value
     * @param {ObjectN} value
     * @return {Object}
     */
    extend = function(target, source){
        if(this === win){
            for(var key in source) hasOwn.call(source, key) && (target[key] = source[key]);
            return target;
        }else{
            var args = slice.call(arguments),
                _this = this,
                cloneObj = function(o){
                    var obj = isArray(o) ? [] : {};
                    for(var key in o){
                        if(o[key] === _this){
                            continue;
                        }
                        if(hasOwn.call(o, key)){
                            obj[key] = 'object' === typeof o[key] ? cloneObj(o[key]) : o[key];
                        }
                    }
                    return obj;
                };

            each(args, function(){
                if(isObject(this)){
                    for(var key in this){
                        var copy = this[key];
                        if(copy === _this){
                            continue;
                        }
                        if('object' === typeof copy){
                            _this[key] = cloneObj(copy);
                        }else{
                            _this[key] = copy;
                        }
                    }
                }
            });
        }
    },

    /**
     * 延迟执行函数
     *
     * @param {Function} value
     */
    nextTick = (function(){
        var ref, callbacks = [], Observer, type = 'promise',

        callback = function(){
            if(callbacks.length > 0){
                while( callbacks.length )callbacks.shift()();
            }
        };
        
        // ie10+ setImmediate
        if(isFunction(win.setImmediate)){
            ref = win.setImmediate;
        }else if("onreadystatechange" in doc.createElement("script")){
        // ie10- onreadystatechange
            ref = function(fn){
                callbacks.push(fn);
                var script = doc.createElement("script");
                script.onreadystatechange = function(){
                    this.onreadystatechange = null;
                    doc.body.removeChild(this);
                    script = null;
                    callback();
                }
                doc.body.appendChild(script);
            }
        }else if(Observer = win.MutationObserver
            || win.webKitMutationObserver){
            // w3c broswer observer
            var observer = new Observer(function(mutations){
                var item = mutations[0];
                if(item.attributeName === type){
                    callback();   
                }
            });
            var elem = doc.createElement('div');
            observer.observe(elem, {attributes: true});

            ref = function(fn){
                callbacks.push(fn);
                elem.setAttribute(
                    type,  (new Date()).getTime()
                );
            }
        }else if(isFunction(win.postMessage)){
            win.addEventListener('message', function(ev){
                if(ev.source === win && ev.data === type){
                    callback();
                }
            }, !1);

            ref = function(fn){
                callbacks.push(fn);
                win.postMessage(type, '*');
            }
        }else{
        // older broswer
            ref = function(fn){
                callbacks.push(fn);
                setTimeout(callback, 0);
            }
        }

        return ref;
    })(),

    /**
     * Fulfilled, Rejected函数包装
     *
     * @param {Defer} value
     * @param {promise} value
     * @param {Function} value
     * @param {Function} value
     * @return {promise|data}
     */
    fulCallback = function(defer, promise, onFulfilled, onRejected){
        return function(data){
            var _ref;
            try{
                if(promise._status === STATUS.FULFILLED){
                    _ref = isFunction(onFulfilled) ? onFulfilled(data) : data;
                }else if(promise._status === STATUS.REJECTED){
                    _ref = isFunction(onRejected) ? onRejected(data) : data;
                }

                if(isPromise(_ref)){
                    _ref.then(function(data){
                        defer.resolve(data);
                    },function(reason){
                        defer.reject(reason);
                    });
                }else{
                    if(promise._status !== STATUS.REJECTED || onRejected){
                        defer.resolve(_ref);
                    }else{
                        defer.reject(_ref);
                    }
                }
            }catch(ex){
                defer.reject(ex);
            }
            return _ref;
        }
    },

    /**
     * 延迟执行异步队列
     *
     * @param {Defer} value
     * @param {...} value
     * @param {Number} value
     */
    _asyncTrigger = function(defer, data, status){
        var promise = defer.promise;
        if(promise._status === STATUS.PENDING){
            promise._status = status;
            promise[status === STATUS.FULFILLED ? '_data' : '_reason'] = data;
        }

        if(promise._resolves.length > 0){
            each(promise._resolves, function(i, e){
                nextTick(function(){ e( data ); });
            });
        }
    };

    /**
     * Promise 构造器
     */
    var Promise = function(){
        extend.call(this, initAttrs);
    };

    
    extend.call(Promise.prototype, {
        constructor: Promise,

        /**
         * Promise 核心功能 then函数
         * 
         * @param {Function} value
         * @param {Function} value
         * @return {promise}
         */
        then: function(onFulfilled, onRejected){
            var defer = new Defer(),
                fulfill = fulCallback.apply(null, [defer, this].concat(slice.call(arguments)));

            if(this._status === STATUS.PENDING){
                this._resolves.push(fulfill);
            }else{
                nextTick((function(_this){
                    return function(){
                        fulfill(_this._status === STATUS.FULFILLED ? _this._data : _this._reason);
                     }
                })(this));
            }
            return defer.promise;
        },

        /**
         * otherwise 只定义onRejected的情况
         * 
         * @param {Function} value
         * @return {promise}
         */
        otherwise: function(onRejected){
            return this.then(undefined, onRejected);
        }
    });

    /**
     * Defer 构造器
     */
    var Defer = function(){
        if(!(this instanceof Defer)){
            return new Defer();
        }
        this.promise = new Promise();
    };
    
    /**
     * resolve
     * 
     * @param {...} value
     */
    Defer.prototype.resolve = function(data){
        return _asyncTrigger(this, data, STATUS.FULFILLED);
    }

    /**
     * reject
     * 
     * @param {...} value
     */
    Defer.prototype.reject = function(reason){
        return _asyncTrigger(this, reason, STATUS.REJECTED);
    }

    extend.call(Defer, {

        /**
         * Defer.promise
         *
         * @public
         * @param {Function}
         * @return promise
         */
        promise: function(fn){
            var defer = new Defer;
            fn(defer);
            return defer.promise;
        },

        /**
         * Defer.resolve
         *
         * @public
         * @param {...}
         * @return promise
         */
        resolve: function(data){
            return this.promise(function(resolver){
                resolver.resolve(data)
            });
        },

        /**
         * Defer.reject
         *
         * @public
         * @param {...}
         * @return promise
         */
        reject: function(reason){
            return this.promise(function(resolver){
                resolver.reject(reason)
            });
        },

        /**
         * all
         *
         * @public
         * @param {Array.<Promise>|...Promise} promises
         * @return promise
         */
        all: function(promises){
            promises = isArray(promises) ? promises : slice.call(arguments)
            var defer = new Defer(),
                _ret = [], len = 0,
                resolveHandler = function(index){
                    return function(data){
                        _ret[index] = data;
                        len++;
                        if(len >= promises.length){
                            defer.resolve(_ret);
                        }
                    }
                };

            each(promises, function(index){
                if(isPromise(this)){
                    this.then(resolveHandler(index), function(reason){
                        defer.reject(reason)
                    });
                }else{
                    throw new TypeError('Arguments is not promise');
                }
                
            });

            return defer.promise;
        }
    });

    root.Defer = Defer;
})(this);
