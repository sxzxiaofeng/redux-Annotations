import compose from './compose'

/**
 * Creates a store enhancer that applies middleware to the dispatch method
 * of the Redux store. This is handy for a variety of tasks, such as expressing
 * asynchronous actions in a concise manner, or logging every action payload.
 *
 * See `redux-thunk` package as an example of the Redux middleware.
 *
 * Because middleware is potentially asynchronous, this should be the first
 * store enhancer in the composition chain.
 *
 * Note that each middleware will be given the `dispatch` and `getState` functions
 * as named arguments.
 *
 * @param {...Function} middlewares The middleware chain to be applied.
 * @returns {Function} A store enhancer applying the middleware.
 */
export default function applyMiddleware(...middlewares) {
  return createStore => (...args) => {
    // 此时...arg=(reducer, preloadedState)
    const store = createStore(...args) 
    // 此时 store={dispatch,subscribe,getState,replaceReducer,[$$observable]: observable}

    let dispatch = () => { //防止在构建期间dispatch
      throw new Error(
        'Dispatching while constructing your middleware is not allowed. ' +
          'Other middleware would not be applied to this dispatch.'
          /**
           * 构建您的中间件时不允许Dispatching
           * 其他中间件将不会应用于此dispatch
           */
      )
    }

    const middlewareAPI = {
      getState: store.getState,
      dispatch: (...args) => dispatch(...args)
    }
    /**
     * export function thunk({ dispatch, getState }) {
        return next => action =>
          typeof action === 'function' ? action(dispatch, getState) : next(action)
      }
     */
    const chain = middlewares.map(middleware => middleware(middlewareAPI)) 
    /**
     * 给每个中间件加入middlewareAPI
     * 如 chian = [middleware1, middleware2, middleware3]
     */
    dispatch = compose(...chain)(store.dispatch)
    /**
     * 通过compose函数传入chain一层层增强dispatch
     * dispatch = compose(...chain)(store.dispatch)，即执行 middleware1(middleware2(middleware3(store.dispatch)))
     */

    return {
      ...store,
      dispatch //通过中间件增强之后的dipatch
    }
  }
}
