# react-redux 
## Main flow
provide.js(创建context，将createStore创建的store对象作为context值，并且订阅state)
=>connect.js(传入mapStateToProps,mapDisPatchToProps等参数)
=>mapDispatchToProps.js & mapStateToProps.js & mergeProps.js (类型检测以及将props和state，dispatch merge成为一个对象)
=>生成initMapStateToProps、initMapDispatchToProps、initMergeProps，执行connectHOC(selectorFactory,options)并将其结果返回
=>进入connectAdvanced.js
=>connectAdvanced函数接收selectorFactory,options参数 ，对options中的参数进行判断并抛出相关错误，拿到Context(是通过Provide.js创建的context)，
返回一个函数wrapWithConnect(WrappedComponent) WrappedComponent就是connect包裹的组件，
判断WrappedComponent是不是一个有效的组件，
获取到被包装组件的name，通过name得到displayName（用于报错）,
新建一个selectorFactoryOptions变量，
新建一个createChildSelector函数返回值为selectorFactory(store.dispatch, selectorFactoryOptions)。
=>声明一个ConnectFunction函数,这个函数就是最终connect包装组件之后生成的组件接收一个props，
从props中结构出propsContext(props.context), forwardedRef, wrapperProps(剩下的props属性)，
然后判断使用哪个context(是props中的还是context，还是Context)，然后通过useContext获取到store之后，
判断store是在context中还是props中，如果都不是就抛出异常。
=>拿到store，声明childPropsSelector值为createChildSelector(store)的执行结果（childPropsSelector=pureFinalPropsSelector）
=>进入selectorFactory.js，调用initMapStateToProps、initMapDispatchToProps得到proxy function, proxy包含mapToProps函数, dependsOnOwnProps属性，调用initMergeProps，也就是connect的第三个参数，如果不传 默认会得到一个函数，函数能把stateProps, dispatchProps, ownProps merge成一个对象，然后是参数检测，最后返回pureFinalPropsSelectorFactory。
=>再次进入connectAdvanced.js，
=>获取subscription, notifyNestedSubs。如果用户没有订阅state的更改，则返回一个[null,null]。获取Subscription实例，传入store和subscription（这时需要判断，是否是从props中拿到的store，是就通过store中的订阅器订阅更新，否就使用父组件的subscription）。
=>获取到新的context值，react的思路就是单项数据流，并且逐层传递，所以要获取到当前组件的context，然后用这个context，提供给子组件使用。
=>使用useReducer获取state和dispatch
=>为了获取获取将state props dispatch merge之后的新props（actualChildProps），调用childPropsSelector函数，获取到真实的props
=>执行两个useLayoutEffect()，第一个捕获包装器和子属性，以便以后进行比较。第二个创建一个checkForUpdates函数并且返回，这个函数就是添加在订阅数组中的函数，由这个函数触发组件的更新。