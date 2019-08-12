import verifyPlainObject from '../utils/verifyPlainObject'

export function wrapMapToPropsConstant(getConstant) {
  return function initConstantSelector(dispatch, options) {
    /**
     * 1.whenMapDispatchToPropsIsObject:
     * getConstant= dispatch =>bindActionCreators(mapDispatchToProps, dispatch)
     * constant={} bindActionCreators()之后返回一个{}
     * 
     * 2.
     * getConstant= dispatch => ({ dispatch })
     * constant={dispatch:dispatch}
     */
    const constant = getConstant(dispatch, options)

    function constantSelector() {
      return constant
    }
    constantSelector.dependsOnOwnProps = false
    return constantSelector
  }
}

// dependsOnOwnProps is used by createMapToPropsProxy to determine whether to pass props as args
// to the mapToProps function being wrapped. It is also used by makePurePropsSelector to determine
// whether mapToProps needs to be invoked when props have changed.
//
// A length of one signals that mapToProps does not depend on props from the parent component.
// A length of zero is assumed to mean mapToProps is getting args via arguments or ...args and
// therefore not reporting its length accurately..
/**
 * CreateMapTopropsProxy使用DependsOnWnProps来确定是否将Props作为参数传递给要包装的MapToprops函数。
 * makepurePropsSelector还使用它来确定当props发生更改时是否需要调用mapToProps。
 * 一个长度的信号表示maptoprops不依赖于父组件中的props。
 * 假设长度为零表示maptoprops通过参数或…参数获取参数，因此无法准确报告其长度。
 */
export function getDependsOnOwnProps(mapToProps) {
  return mapToProps.dependsOnOwnProps !== null &&
    mapToProps.dependsOnOwnProps !== undefined
    ? Boolean(mapToProps.dependsOnOwnProps)
    // 第一次调用时mapToProps的dependsOnOwnProps为undefined，直接判断参数个数
    : mapToProps.length !== 1
}

// Used by whenMapStateToPropsIsFunction and whenMapDispatchToPropsIsFunction,
// this function wraps mapToProps in a proxy function which does several things:

// 由When MapStateToPropsIsFunction和WhenMapDispatchToPropsIsFunction使用，
// 此函数将mapToProps包装在代理函数中，该函数执行以下几项操作：
//
//  * Detects whether the mapToProps function being called depends on props, which
//    is used by selectorFactory to decide if it should reinvoke on props changes.
// 检测正在调用的mapToProps函数是否依赖于props，selectorFactory使用props来决定是否应在props更改时重新调用
//  * On first call, handles mapToProps if returns another function, and treats that
//    new function as the true mapToProps for subsequent calls.
// 第一次调用时，如果返回另一个函数，则处理mapToProps，并将该新函数视为后续调用的真正mapToProps。
//  * On first call, verifies the first result is a plain object, in order to warn
//    the developer that their mapToProps function is not returning a valid result.
//在第一次调用时，验证第一个结果是普通对象，以警告开发人员他们的mapToProps函数没有返回有效的结果。
export function wrapMapToPropsFunc(mapToProps, methodName) {
  /**
   * mapToProps:使用connect是传递的mapStateToProps或者mapDispatchToProps
   * methodName = 'mapStateToProps' || 'mapDispatchToProps'
   */
  return function initProxySelector(dispatch, { displayName }) {
    // 定义proxy function，且作为返回值
    /**
     * 
     * @param {*} ownProps 为当前组件的props
     */
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      // 第一次调用 mapToPropsProxy时返回detectFactoryAndVerify(stateOrDispatch, ownProps)
      return proxy.dependsOnOwnProps
        ? proxy.mapToProps(stateOrDispatch, ownProps)
        : proxy.mapToProps(stateOrDispatch)
    }

    // allow detectFactoryAndVerify to get ownProps
     // dependsOnOwnProps标记运行依赖组件的props为true
    proxy.dependsOnOwnProps = true
    //目前第一次调用链是这样的
    // const initMapStateToProps = 
    //initProxySelector(dispatch, { displayName })=>mapToPropsProxy(stateOrDispatch, ownProps) => detectFactoryAndVerify(stateOrDispatch, ownProps)
    proxy.mapToProps = function detectFactoryAndVerify(
      stateOrDispatch,
      ownProps
    ) {
      // 调用的时候 mapToProps(就是使用connect时第一个参数) 赋值给 proxy.mapToProps
      //也就是第一次除了调用到proxy.mapToProps之后, 以后在调用到proxy.mapToProps的时候则使用传递的mapToProps function
      proxy.mapToProps = mapToProps
      // 重新判断 dependsOnOwnProps(第一次默认true)
      proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
      //这是props就是组件中被注入store中的部分state
      let props = proxy(stateOrDispatch, ownProps)//相当于mapToProps(stateOrDispatch,[ownProps])

      // 如果props为function再次执行
      if (typeof props === 'function') {
        proxy.mapToProps = props
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps)
      }

      // 非production环境检查
      if (process.env.NODE_ENV !== 'production')
        // verifyPlainObject是utils方法， 如果不是纯对象，抛出warning
        verifyPlainObject(props, displayName, methodName)

      return props
    }

    return proxy
  }
}
