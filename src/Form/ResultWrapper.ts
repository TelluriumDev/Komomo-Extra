export interface ResultWrapper<T> {
    /**
     * Get the result of a player of the form.
     * - 获取对应玩家的表单结果。
     *
     * @param player player
     *        - 玩家
     */
    by(player: Player): T | undefined
}
