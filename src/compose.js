/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */

export default function compose(...funcs) {
  if (funcs.length === 0) {
    return arg => arg
  }

  if (funcs.length === 1) {
    return funcs[0]
  }

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
  /**
   *  每次循环返回一个函数 (...args) => a(b(...args))，所以每当一次循环结束之后a=(...args) => a(b(...args))
   *  例如[f,g,h].reduce((total,item)=>(...args) => total(item(...args)))
   *  如果没有初始值，则a取数组中的第一项
   * 
   *  total=(...args) =>f(g(...args))
   *  total=(...args) =>f(g(h(...args)))
   * */
}
