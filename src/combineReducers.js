import ActionTypes from './utils/actionTypes'
import warning from './utils/warning'
import isPlainObject from './utils/isPlainObject'

function getUndefinedStateErrorMessage(key, action) {
  const actionType = action && action.type
  const actionDescription =
    (actionType && `action "${String(actionType)}"`) || 'an action'

  return (
    `Given ${actionDescription}, reducer "${key}" returned undefined. ` +
    `To ignore an action, you must explicitly return the previous state. ` +
    `If you want this reducer to hold no value, you can return null instead of undefined.`
  )
}

function getUnexpectedStateShapeWarningMessage(
  inputState,
  reducers,
  action,
  unexpectedKeyCache
) {
  const reducerKeys = Object.keys(reducers)
  const argumentName =
    action && action.type === ActionTypes.INIT //判断是初始化时reducer，还是之后的reducer
      ? 'preloadedState argument passed to createStore'//传递给createStore的preloadedState参数
      : 'previous state received by the reducer'//reducer接收的先前状态

  if (reducerKeys.length === 0) {
    return (
      'Store does not have a valid reducer. Make sure the argument passed ' +
      'to combineReducers is an object whose values are reducers.'
      //Store没有有效的reducer。确保传递给comineReducers的参数是一个值为Reducers的对象
    )
  }

  if (!isPlainObject(inputState)) {
    return (
      `The ${argumentName} has unexpected type of "` +
      {}.toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
      `". Expected argument to be an object with the following ` +
      `keys: "${reducerKeys.join('", "')}"`
    )
  }

  /**
   * 获取state上未被reducer处理的状态的键值unexpectedKeys，并将其存入cache值中。
   */
  const unexpectedKeys = Object.keys(inputState).filter(//如果reducer的属性中没有state，并且unexpectedKeyCache中没有对应的值
    key => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
  )

  unexpectedKeys.forEach(key => {
    unexpectedKeyCache[key] = true
  })
/**
 * 检测是否为内置的replace action，因为当使用store的replaceReducer时会自动触发该内置action，
 * 并将reducer替换成传入的，此时检测的reducer和原状态树必然会存在冲突，
 * 所以在这种情况下检测到的unexpectedKeys并不具备参考价值，将不会针对性的返回抛错信息，反之则会返回。
 */
  if (action && action.type === ActionTypes.REPLACE) return

  if (unexpectedKeys.length > 0) {
    return (
      `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
      `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
      `Expected to find one of the known reducer keys instead: ` +
      `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
    )
  }
}

function assertReducerShape(reducers) { //遍历执行所有的reducer，进行返回类型的判断
  Object.keys(reducers).forEach(key => {
    const reducer = reducers[key]
    const initialState = reducer(undefined, { type: ActionTypes.INIT })

    if (typeof initialState === 'undefined') {
      throw new Error(
        `Reducer "${key}" returned undefined during initialization. ` +
          `If the state passed to the reducer is undefined, you must ` +
          `explicitly return the initial state. The initial state may ` +
          `not be undefined. If you don't want to set a value for this reducer, ` +
          `you can use null instead of undefined.`
          /**
           * 在初始化期间返回undefined。
           * 如果传递给reducer的state未定义，则必须显式返回初始状态。
           * 初始状态不能是未定义的。如果不想为此reducer设置值，可以使用NULL而不是undefined。`
           */
      )
    }

    if (
      typeof reducer(undefined, {
        type: ActionTypes.PROBE_UNKNOWN_ACTION()
      }) === 'undefined'
    ) {
      throw new Error(
        `Reducer "${key}" returned undefined when probed with a random type. ` +
          `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
          `namespace. They are considered private. Instead, you must return the ` +
          `current state for any unknown actions, unless it is undefined, ` +
          `in which case you must return the initial state, regardless of the ` +
          `action type. The initial state may not be undefined, but can be null.`
          /**
           * 使用随机类型探测时，还原器“${key}”返回undefined。
           * 不要试图在“redux/*”名称空间中处理${ActionTypes.INIT}或其他操作。
           * 他们被认为是私人的。相反，您必须返回任何未知操作的当前状态，除非未定义，
           * 在这种情况下，无论操作类型如何，都必须返回初始状态。初始状态不能未定义，但可以为空。
           */
      )
    }
  })
}

/**
 * Turns an object whose values are different reducer functions, into a single
 * reducer function. It will call every child reducer, and gather their results
 * into a single state object, whose keys correspond to the keys of the passed
 * reducer functions.
 *
 * 将值为不同reducer函数的对象转换为单个reducer函数。
 * 它将调用每个子reducer，并将它们的结果收集到一个state对象中，该对象的键对应于传递的reducer函数的键。
 * 
 * @param {Object} reducers An object whose values correspond to different
 * reducer functions that need to be combined into one. One handy way to obtain
 * it is to use ES6 `import * as reducers` syntax. The reducers may never return
 * undefined for any action. Instead, they should return their initial state
 * if the state passed to them was undefined, and the current state for any
 * unrecognized action.
 * 
 * reducers是一个对应不同reducer函数的对象,这些reducer函数需要组合成一个reducer.
 * 一个很方便获取到它的方法就是使用ES6 的`import * as reducers`语法,reducer可能从不会
 * 返回undefined.相反,它们应该返回初始的state. 如果传给它们的state是undefined,任何
 * 不被识别的action都会返回当前的state
 * 
 * @returns {Function} A reducer function that invokes every reducer inside the
 * passed object, and builds a state object with the same shape.
 * 
 * 返回一个reducer函数,会触发传进来的对象中的每一个reducer,建立一个有相同结构的state对象
 */


 /**
  * 主流程：
  * 1.过滤掉不是function和undefined的reducer，生成finalReducerKeys
  * 2.执行assertReducerShape(finalReducers),遍历执行两次数组内的reducer，对返回值进行判断
  * 3.返回一个combination函数，这个函数就是createStore函数中的reducer参数.
  * 4.当每次dispatch的时候，通过getUnexpectedStateShapeWarningMessage()，进行参数的检测，
  *   循环遍历每一个reducer并执行，返回：
  * {
  *   reducer1:state,
  *   reducer2:state,
  *   ...
  * }
  */
export default function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers)
  const finalReducers = {}
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i]

    if (process.env.NODE_ENV !== 'production') {
      if (typeof reducers[key] === 'undefined') {
        warning(`No reducer provided for key "${key}"`)
      }
    }

    if (typeof reducers[key] === 'function') { //过滤掉不是function的
      finalReducers[key] = reducers[key]
    }
  }
  const finalReducerKeys = Object.keys(finalReducers)

  // This is used to make sure we don't warn about the same
  // keys multiple times.
  let unexpectedKeyCache
  if (process.env.NODE_ENV !== 'production') {
    unexpectedKeyCache = {}
  }

  let shapeAssertionError
  try {
    assertReducerShape(finalReducers) //遍历执行两次数组内的reducer，对返回值进行判断
  } catch (e) {
    shapeAssertionError = e
  }

  return function combination(state = {}, action) {//作为createStore中reducer参数
    if (shapeAssertionError) {
      throw shapeAssertionError
    }

    if (process.env.NODE_ENV !== 'production') {
      const warningMessage = getUnexpectedStateShapeWarningMessage(
        state,
        finalReducers,
        action,
        unexpectedKeyCache
      )
      if (warningMessage) {
        warning(warningMessage)
      }
    }

    let hasChanged = false //判断state是否改变
    const nextState = {}
    /**
     * 每次dispatch的时候就会遍历执行所有的reducer
     */
    for (let i = 0; i < finalReducerKeys.length; i++) { 
      const key = finalReducerKeys[i]
      const reducer = finalReducers[key]
      const previousStateForKey = state[key]
      const nextStateForKey = reducer(previousStateForKey, action)
      if (typeof nextStateForKey === 'undefined') {
        const errorMessage = getUndefinedStateErrorMessage(key, action)
        throw new Error(errorMessage)
      }
      nextState[key] = nextStateForKey
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey
    }
    return hasChanged ? nextState : state //改变了则返回改变之后的state，否则返回之前的state
  }
}
