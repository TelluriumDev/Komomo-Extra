import ModernError from "modern-errors"
import modernErrorsClean from 'modern-errors-clean'

export const KomomoError = ModernError.subclass("KomomoError", {
    plugins: [modernErrorsClean]
})


export const IllegalArgumentError = KomomoError.subclass("IllegalArgumentError")

export const IndexOutOfBoundsError = KomomoError.subclass("IndexOutOfBoundsError");