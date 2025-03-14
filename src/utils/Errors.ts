import ModernError from "modern-errors"
import modernErrorsClean from "modern-errors-clean"

/**
 * an error that is thrown by the library.
 * - 库抛出的错误。
 * @description
 * You can get the `stack' property to get the stack trace information in a formatted way.
 * - 你可以通过 `stack' 属性获取格式化后的堆栈信息。
 */
export const KomomoError = ModernError.subclass("KomomoError", {
    plugins: [modernErrorsClean],
    custom: class extends ModernError {
        constructor(message: string, options?: any) {
            const causedBy = options?.causedBy
            if (causedBy) {
                message += `
caused by:
${options.causedBy}
`
            }
            super(message, options)
            this.causedBy = causedBy
        }

        /**
         * the reason why the error was thrown.
         * - 抛出错误的原因。
         */
        causedBy?: any
    }
})

/**
 * an error that is thrown when an argument is not valid.
 * - 当一个参数不合法时抛出的错误。
 */
export const IllegalArgumentError = KomomoError.subclass("IllegalArgumentError")

/**
 * an error that is thrown when an index is out of bounds.
 * - 当索引超出范围时抛出的错误。
 */
export const IndexOutOfBoundsError = KomomoError.subclass(
    "IndexOutOfBoundsError"
)
