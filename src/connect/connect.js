import connectAdvanced from '../components/connectAdvanced'
import shallowEqual from '../utils/shallowEqual'
import defaultMapDispatchToPropsFactories from './mapDispatchToProps'

// mapStateToProps(state, ownProps)
// 只要 Redux store 发生改变,mapStateToProps 函数就会被调用, 
// 或者如果有ownProps参数组件接收到新的props,mapStateToProps同样会被调用
// defaultMapStateToPropsFactories是一个数组，用来判断传入的值是否是func还是undefined
import defaultMapStateToPropsFactories from './mapStateToProps'

// mapStateToProps() 与 mapDispatchToProps() 的执行结果和组件自身的 props 将传入到这个回调函数中
import defaultMergePropsFactories from './mergeProps'
import defaultSelectorFactory from './selectorFactory'

/*
  connect is a facade over connectAdvanced. It turns its args into a compatible
  selectorFactory, which has the signature:

  connect是覆盖在connectAdvanced。它将其args转换为兼容的selectorFactory，其签名为：

    (dispatch, options) => (nextState, nextOwnProps) => nextFinalProps
  
  connect passes its args to connectAdvanced as options, which will in turn pass them to
  selectorFactory each time a Connect component instance is instantiated or hot reloaded.

  // Connect将其args传递给connectAdvanced 作为options，
  // 后者将在每次实例化或热加载Connect组件实例时将其传递给selectorFactory。

  selectorFactory returns a final props selector from its mapStateToProps,
  mapStateToPropsFactories, mapDispatchToProps, mapDispatchToPropsFactories, mergeProps,
  mergePropsFactories, and pure args.

  // selectorFactory从它的mapStateToProps、mapStateToPropsFacreals、mapDispatchToProps、
  // mapDispatchToPropsFacreals、mergeProps、mergePropsFacreals和pure args返回最终的props selectors。

  The resulting final props selector is called by the Connect component instance whenever
  it receives new props or store state.
 */

function match(arg, factories, name) {
  // 从后到前遍历factories
  //factories=[whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing]
  for (let i = factories.length - 1; i >= 0; i--) {
    const result = factories[i](arg)
    if (result) return result
  }
  // 不符合connect方法规则throw Error
  return (dispatch, options) => {
    throw new Error(
      `Invalid value of type ${typeof arg} for ${name} argument when connecting component ${
        options.wrappedComponentName
      }.`
    )
  }
}

function strictEqual(a, b) { 
  return a === b
}

// createConnect with default args builds the 'official' connect behavior. Calling it with
// different options opens up some testing and extensibility scenarios
export function createConnect({
  connectHOC = connectAdvanced,
  mapStateToPropsFactories = defaultMapStateToPropsFactories,
  mapDispatchToPropsFactories = defaultMapDispatchToPropsFactories,
  mergePropsFactories = defaultMergePropsFactories,
  selectorFactory = defaultSelectorFactory
} = {}) {
  /**
   * 语法：
   * connect([mapStateToProps],[mapDispatchToProps],
   * [mergeProps],[options])(<Xxx / >)
   */
  return function connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    {//默认值
      // 是否就行浅比较的配置
      pure = true,
      // 判断是否相同引用的function
      areStatesEqual = strictEqual, // 判断object引用, strictEqual(a, b)=> a === b
      areOwnPropsEqual = shallowEqual,
      areStatePropsEqual = shallowEqual,
      areMergedPropsEqual = shallowEqual,
      // 其他配置项
      ...extraOptions
    } = {}//默认值为{}
  ) {
    const initMapStateToProps = match(
      mapStateToProps,
      mapStateToPropsFactories,
      'mapStateToProps'
    )
    const initMapDispatchToProps = match(
      mapDispatchToProps,
      mapDispatchToPropsFactories,
      'mapDispatchToProps'
    )
    const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')

    return connectHOC(selectorFactory, {
      // used in error messages
      // 用于错误消息中
      methodName: 'connect',

      // used to compute Connect's displayName from the wrapped component's displayName.
      // 用于从包装组件的DisplayName计算Connect的DisplayName。
      getDisplayName: name => `Connect(${name})`,

      // if mapStateToProps is falsy, the Connect component doesn't subscribe to store state changes
      // 如果mapStateToProps为false，则Connect组件不订阅store state更改
      shouldHandleStateChanges: Boolean(mapStateToProps),

      // passed through to selectorFactory
      //传递给selectorFactory
      initMapStateToProps,
      initMapDispatchToProps,
      initMergeProps,
      pure,
      //strictEqual 这里很容易想到用于判断this.state是不是都一份引用
      areStatesEqual,
      areOwnPropsEqual,
      areStatePropsEqual,
      areMergedPropsEqual,

      // any extra options args can override defaults of connect or connectAdvanced
      // 任何额外的选项args都可以覆盖connect或connectAdvanced的默认值
      ...extraOptions
    })
  }
}

export default createConnect()
