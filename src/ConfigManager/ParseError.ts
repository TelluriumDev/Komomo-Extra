import { KomomoError } from "../Utils/Errors.js";

/**
 * an error that is thrown when a Jsonc syntax error occurs.
 * - 当 Jsonc 语法错误发生时抛出的错误。
 */
export const JsoncSyntaxError = KomomoError.subclass("JsoncSyntaxError");
