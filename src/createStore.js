import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export default function createStore(reducer, preloadedState, enhancer) {
  if (
    (typeof preloadedState === 'function' && typeof enhancer === 'function') ||
    (typeof enhancer === 'function' && typeof arguments[3] === 'function')
  ) {
    throw new Error(
      'It looks like you are passing several store enhancers to ' +
        'createStore(). This is not supported. Instead, compose them ' +
        'together to a single function.'
        //看起来您正在将几个store enhancers传递给createStore()
        //,createStore不支持，改为compose可以把它们合为一个function
    )
  }

  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    // 这里的 enhancer 是 applyMiddleware(...) 执行后的高阶函数
    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer
  let currentState = preloadedState// 拿到当前 State
  let currentListeners = [] // 初始化 listeners 用于放置监听函数，用于保存快照供当前 dispatch 使用
  let nextListeners = currentListeners //引用传值 指向当前 listeners，在需要修改时复制出来修改为下次快照存储数据，不影响当前订阅
  let isDispatching = false// 用于标记是否正在进行 dispatch，用于控制 dispatch 依次调用不冲突

  /**
   * This makes a shallow copy of currentListeners so we can use
   * nextListeners as a temporary list while dispatching.
   * 
   * 这是currentListeners的浅拷贝，所以我们可以使用nextListeners作为调度时的临时列表。
   * 
   * This prevents any bugs around consumers calling
   * subscribe/unsubscribe in the middle of a dispatch.
   * 
   * 这样可以防止消费者在dispatch过程中 订阅/取消订阅 调用时出现任何错误
   */
  //在一段时间内始终没有新的订阅或取消订阅的情况下，nextListeners 与 currentListeners 可以共用内存
  // 确保可以改变 nextListeners。没有新的listener 可以始终用同一个引用
  function ensureCanMutateNextListeners() {
    // 需要写入新的监听之前调用，如果是指向同一个地址的话，就把nextListeners复制出来
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  /**
   * Reads the state tree managed by the store.                  通过store读取state
   *
   * @returns {any} The current state tree of your application.  返回应用程序的当前状态树。
   */
  function getState() {
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
          /**
           * 在Reducer执行时不能调用store.getState()
           * reducer已收到state作为参数。
           * 从顶端reducer往下递送，而不是从店里读出。
           */
      )
    }

    return currentState
  }

  /**
   * Adds a change listener. It will be called any time an action is dispatched,
   * and some part of the state tree may potentially have changed. You may then
   * call `getState()` to read the current state tree inside the callback.
   *
   * 添加更改监听程序。它将在任何时候被调用一个action调度，并且state tree的某些部分可能已经改变。
   * 然后你可以调用`getState()`读取回调内部的当前state tree。
   * 
   * You may call `dispatch()` from a change listener, with the following
   * 您可以从变更监听器中调用`dispatch()`，如下所示。
   * caveats:
   *
   * 1. The subscriptions are snapshotted just before every `dispatch()` call.
   * If you subscribe or unsubscribe while the listeners are being invoked, this
   * will not have any effect on the `dispatch()` that is currently in progress.
   * However, the next `dispatch()` call, whether nested or not, will use a more
   * recent snapshot of the subscription list.
   *
   * 2. The listener should not expect to see all state changes, as the state
   * might have been updated multiple times during a nested `dispatch()` before
   * the listener is called. It is, however, guaranteed that all subscribers
   * registered before the `dispatch()` started will be called with the latest
   * state by the time it exits.
   *
   * @param {Function} listener A callback to be invoked on every dispatch.
   * @returns {Function} A function to remove this change listener.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
      )
    }

    let isSubscribed = true

    ensureCanMutateNextListeners()
    nextListeners.push(listener)

    return function unsubscribe() {
      if (!isSubscribed) { //防止多次触发
        return
      }

      if (isDispatching) {
        throw new Error(
          //在Reducer正在执行时，您不能取消对存储侦听器的订阅
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See https://redux.js.org/api-reference/store#subscribe(listener) for more details.'
        )
      }

      isSubscribed = false

      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1) //去除队列中相对应的listener
      currentListeners = null 
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }

    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action) //currentReducer 传入的reducer
    } finally {
      isDispatching = false
    }

   /**
    * 更新最新的监听对象，相当于：
      currentListeners = nextListeners
      const listeners = currentListeners
      如果再次触发订阅，则会执行ensureCanMutateNextListeners(),然后再次把nextListeners复制出来，添加监听
    */
    const listeners = (currentListeners = nextListeners) //在生成了currentState之后遍历当前的监听列表，逐个执行
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action //返回当前action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   * 
   * 替换store中的reducer。
   * 如果你的应用程序实现了代码拆分，并且你想要动态加载一些reducer，那么你可能需要这个
   * 如果您为Redux实现了热重新加载机制，您可能也需要这个
   * 
   * 官方表示：
      这是一个高级 API。只有在你需要实现代码分隔，
      而且需要立即加载一些 reducer 的时候才可能会用到它。
      在实现 Redux 热加载机制的时候也可能会用到。
   * 
   * 
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  function replaceReducer(nextReducer) { //替换reducer的同时会dipatch`@@redux/REPLACE${randomString()}`
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    currentReducer = nextReducer

    // This action has a similiar effect to ActionTypes.INIT.
    // Any reducers that existed in both the new and old rootReducer
    // will receive the previous state. This effectively populates
    // the new state tree with any relevant data from the old one.
    /**
     * 此操作与ActionTypes.INIT具有相似的效果。
     * 新旧rootReducer中存在的任何Reducer都将收到以前的状态。这将使用旧状态树中的任何相关数据有效地填充新状态树。
     */
    dispatch({ type: ActionTypes.REPLACE }) //初始化state
  }

  /**
   * Interoperability point for observable/reactive libraries.
   * @returns {observable} A minimal observable of state changes.
   * For more information, see the observable proposal:
   * https://github.com/tc39/proposal-observable symbol-observable库
   */
  function observable() {
    const outerSubscribe = subscribe //创建一个外部的订阅函数
    return {
      /**
       * The minimal observable subscription method.
       * @param {Object} observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns {subscription} An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      /**
       * 最小观察者订阅方法。
       * @param {object} 可用作观察者的任何对象。
       * 观察者对象应该有一个`next`方法
       * @returns {Subscription} 具有`unsubscribe`方法的对象，
       * 该方法可用于从存储中取消订阅可观察对象，并防止观察对象进一步发送值。
       * 
       */
      subscribe(observer) {
        if (typeof observer !== 'object' || observer === null) {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() { //如果传入的observer对象有next函数，就执行next()并将当前state放入函数中
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState) //给当前监听的数组加上observeState函数
        return { unsubscribe }
      },
      /**
       * Redux 内部没有用到这个方法，在测试代码 redux/test/createStore.spec.js 中有出现。
       * https://github.com/benlesh/symbol-observable
       */
      [$$observable]() {
        return this
      }
    }
  }

  // When a store is created, an "INIT" action is dispatched so that every
  // reducer returns their initial state. This effectively populates
  // the initial state tree.
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
