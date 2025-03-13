import ModernError from "modern-errors"
import modernErrorsClean from "modern-errors-clean"

/**
 * an error that is thrown by the library.
 * - 库抛出的错误。
 */
export const KomomoError = ModernError.subclass("KomomoError", {
    plugins: [modernErrorsClean],
    custom: class extends ModernError {
        constructor(message: string, options?: any) {
            if (options.causedBy) {
                message += `
caused by:
${options.causedBy}
`
            }
            super(message, options)
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
