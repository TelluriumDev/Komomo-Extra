import { KomomoError } from "../Utils/Errors.js";

/**
 * An error that is thrown when a form is not sent to a player.
 * - 当表单未发送给玩家时抛出的错误。
 */
export const UnsentFormError = KomomoError.subclass("UnsentFormError");