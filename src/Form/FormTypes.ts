import { ResultWrapper } from "./ResultWrapper.js"

/**
 * represents the type of button image.
 * - 按钮图片的类型
 */
export enum SimpleFormImageType {
    URL = "url",
    PATH = "path"
}

export type Result<T> = {
    /**
     * The result of the component.
     * - 组件的结果
     */
    result?: T
}

export type CustomFormComponentResultTypes =
    | boolean
    | string
    | number
    | undefined

export namespace CustomFormComponent {
    export type AbstractComponent<R> = {
        /**
         * The type of the component.
         * - 组件的类型
         */
        type: string
        /**
         * The description text of the component.
         * - 组件的描述文本
         */
        text: string
    } & Result<R>
    export type Label = {
        type: "label"
    } & AbstractComponent<undefined>
    export type Input = {
        type: "input"
        /**
         * The placeholder of the input.
         * - 输入框的提示值
         */
        placeholder?: string
        /**
         * The default value of the input.
         * - 输入框的默认值
         */
        defaultVal?: string
    } & AbstractComponent<string>
    export type Toggle = {
        type: "toggle"
        /**
         * The default value of the toggle.
         * - 开关的默认值
         */
        defaultVal?: boolean
    } & AbstractComponent<boolean>
    export type Dropdown = {
        type: "dropdown"
        /**
         * The options of the dropdown.
         * - 下拉菜单的选项
         */
        options: string[]
        /**
         * The default value of the dropdown.
         * - 下拉菜单的默认值
         */
        defaultVal?: number
    } & AbstractComponent<number>
    export type Slider = {
        type: "slider"
        /**
         * The minimum value of the slider.
         * - 滑块的最小值
         */
        min: number
        /**
         * The maximum value of the slider.
         * - 滑块的最大值
         */
        max: number
        /**
         * The step of the slider.
         * - 滑块的步长
         */
        step?: number
        /**
         * The default value of the slider.
         * - 滑块的默认值
         */
        defaultVal?: number
    } & AbstractComponent<number>
    export type StepSlider = {
        type: "stepSlider"
        /**
         * The steps of the step slider.
         * - 步进滑块的步骤
         */
        steps: string[]
        /**
         * The default value of the step slider.
         * - 步进滑块的默认值
         */
        defaultVal?: number
    } & AbstractComponent<number>
}

export type ResponseResult = {
    player: Player
    success: boolean
    reason?: FormEnum.ModalFormCancelReason
}

export type CustomFormDescription = {
    /**
     * adds a label to the form.
     * - 添加标签到表单。
     * @param text - The text of the label.
     * - 标签的文本。
     */
    label(text: string): ResultWrapper<CustomFormComponent.Label["result"]>
    /**
     * adds an input to the form.
     * - 添加输入框到表单。
     * @param text - The description text of the input.
     * - 输入框的描述文本。
     * @param placeholder - The placeholder of the input.
     * - 输入框的提示值。
     * @param defaultVal - The default value of the input.
     * - 输入框的默认值。
     */
    input(
        text: string,
        placeholder?: string,
        defaultVal?: string
    ): ResultWrapper<CustomFormComponent.Input["result"]>
    /**
     * adds a toggle to the form.
     * - 添加开关到表单。
     * @param text - The description text of the toggle.
     * - 开关的描述文本。
     * @param defaultVal - The default value of the toggle.
     * - 开关的默认值。
     */
    toggle(
        text: string,
        defaultVal?: boolean
    ): ResultWrapper<CustomFormComponent.Toggle["result"]>
    /**
     * adds a dropdown to the form.
     * - 添加下拉菜单到表单。
     * @param text - The description text of the dropdown.
     * - 下拉菜单的描述文本。
     * @param options - The options of the dropdown.
     * - 下拉菜单的选项。
     * @param defaultVal - The default value of the dropdown.
     * - 下拉菜单的默认值。
     */
    dropdown(
        text: string,
        options: string[],
        defaultVal?: number
    ): ResultWrapper<CustomFormComponent.Dropdown["result"]>
    /**
     * adds a slider to the form.
     * - 添加滑块到表单。
     * @param text - The description text of the slider.
     * - 滑块的描述文本。
     * @param min - The minimum value of the slider.
     * - 滑块的最小值。
     * @param max - The maximum value of the slider.
     * - 滑块的最大值。
     * @param step - The step of the slider.
     * - 滑块的步长。
     * @param defaultVal - The default value of the slider.
     * - 滑块的默认值。
     */
    slider(
        text: string,
        min: number,
        max: number,
        step?: number,
        defaultVal?: number
    ): ResultWrapper<CustomFormComponent.Slider["result"]>
    /**
     * adds a step slider to the form.
     * - 添加步进滑块到表单。
     * @param text - The description text of the step slider.
     * - 步进滑块的描述文本。
     * @param steps - The steps of the step slider.
     * - 步进滑块的步骤。
     * @param defaultVal - The default value of the step slider.
     * - 步进滑块的默认值。
     */
    stepSlider(
        text: string,
        steps: string[],
        defaultVal?: number
    ): ResultWrapper<CustomFormComponent.StepSlider["result"]>
    /**
     * adds a callback to the form triggered when the form is submitted.
     * - 添加表单提交时触发的回调。
     * @param callback - The callback to be triggered when the form is submitted.
     * - 表单提交时触发的回调。
     */
    onResponse(
        callback: (
            /**
             * The player who submitted the form.
             * - 提交表单的玩家。
             */
            player: Player
        ) => void
    ): void
    /**
     * adds a callback to the form triggered when the form is canceled.
     * - 添加表单取消时触发的回调。
     * @param callback - The callback to be triggered when the form is canceled.
     * - 表单取消时触发的回调。
     */
    onCancel(
        callback: (
            /**
             * The player who canceled the form.
             * - 取消表单的玩家。
             */
            player: Player,
            /**
             * The reason why the form was canceled.
             * - 表单取消的原因。
             */
            reason: FormEnum.ModalFormCancelReason
        ) => void
    ): void
}
