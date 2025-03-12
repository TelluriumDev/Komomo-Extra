import ModernError from "modern-errors"
import modernErrorsClean from "modern-errors-clean"

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
    }
})

export const IllegalArgumentError = KomomoError.subclass("IllegalArgumentError")

export const IndexOutOfBoundsError = KomomoError.subclass(
    "IndexOutOfBoundsError"
)
