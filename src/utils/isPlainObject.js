/**
 * @param {any} obj The object to inspect.
 * @returns {boolean} True if the argument appears to be a plain object.
 */
/**
 * isPlainObject函数是redux自己用来判断传递给reducer的action对象是一个plain object，
 * 也就是通过字面量方式或者Object构造函数的方式生成的对象，中间没有发生其他的继承情况，
 */
export default function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = obj
  while (Object.getPrototypeOf(proto) !== null) {
    //普通的对象while循环结束后proto的值是：Object.prototype，通过Object.create(null)生成的对象proto的值是：null
    proto = Object.getPrototypeOf(proto)

  }

  return Object.getPrototypeOf(obj) === proto
}
/**
 * 通过Object.getPrototypeOf(obj)和自己的原型对比的原因，
 * 防止一些边界情况，例如例如跨frame访问变量时
 * 
 * 在一个frame里面调用父窗口的函数：
 * window.parent.someFunction(["hello", "world"])
 * 在父窗口中有someFunction的定义：
 * function someFunction(arg) {
    if (arg instanceof Array) {
      // ... operate on the array
    }
  }
  因为两段代码所处的javascript执行环境是不一样的，每个frame都有自己的执行环境，
  也就是说两个执行环境中的Array构造函数都是不等的
  那么if语句的判断就为false
 */
