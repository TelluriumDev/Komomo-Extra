import { delay } from "../Utils/Utils.js"
import {
    SimpleFormImage,
    CustomFormComponent,
    CustomFormDescription,
    CustomFormComponentResultTypes
} from "./FormTypes.js"

import { ResultWrapper } from "./ResultWrapper.js"
import { UnsentFormError } from "./FormError.js"
import { IllegalArgumentError } from "../Utils/Errors.js"

/**
 * A class that represents a form.
 * - 表单的类。
 *
 * @description
 * This class is used to build and send a form.
 * - 用于构建并发送表单。
 *
 * It's strongly recommended to use `FormEx` instead of using the `Form` class directly,
 * because `FormEx` provides more convenient methods to send the form and get the result.
 * - 强烈建议使用 `FormEx` 代替直接使用 `Form` 类，因为 `FormEx` 提供了更方便的构建表单和获取结果的方法。
 */
export abstract class FormEx<R> {
    constructor(public title: string) {}

    setTitle(title: string): this {
        this.title = title
        return this
    }

    /**
     * send the form to a player.
     * - 向玩家发送表单.
     * @param player player
     *        - 玩家
     */
    abstract send(player: Player): void

    /**
     * get the result of a sended form.
     *
     * @param player player who sent the form.
     *        - 发送表单的玩家
     *
     * @returns `Promise<R>` if the form hasn't been sent to the player, it will be rejected with an error.
     * if the player cancelled the form, the promise will be rejected with the cancel reason as `FormEnum.ModalFormCancelReason`.
     * if the result is not cancelled, the promise will be resolved with the result.
     *        - 如果表单尚未发送给玩家，promise 将被拒绝。
     *        - 如果玩家取消表单，promise 将被拒绝，取消原因将作为 `FormEnum.ModalFormCancelReason`。
     *        - 如果结果未取消，promise 将被解决，结果将被返回。
     */
    abstract getResult(player: Player): Promise<R>
}

export class ModalFormEx extends FormEx<boolean> {
    constructor(
        title: string,
        public content: string = "",
        upperButton: string = "Confirm",
        lowerButton: string = "Cancel"
    ) {
        super(title)
        this.#upperButton = { text: upperButton }
        this.#lowerButton = { text: lowerButton }
        this.#form = Form.newModalForm(title, content, upperButton, lowerButton)
    }

    #form: ModalForm

    #resultList: Map<string, Promise<boolean>> = new Map()

    #upperButton: {
        text: string
        callback?: (player: Player) => void
    }

    #lowerButton: {
        text: string
        callback?: (player: Player) => void
    }

    override async getResult(player: Player): Promise<boolean> {
        if (!this.#resultList.has(player.uuid)) {
            throw new UnsentFormError(
                `The modal form '${this.title}' has not been sent to the player: ${player.realName}`
            )
        }
        return this.#resultList.get(player.uuid)!
    }

    override send(player: Player): void {
        if (!(player instanceof Player)) {
            throw new IllegalArgumentError(
                "ModalFormEx.send expects a player instance as an argument, but got something else.",
                {
                    causedBy: player
                }
            )
        }
        const promise = new Promise<boolean>((resolve, reject) => {
            const success = this.#form.sendTo(player, (_, result) => {
                if (Number.isInteger(result)) {
                    // Cancelled
                    reject(result as FormEnum.ModalFormCancelReason)
                    return
                }
                resolve(Promise.resolve(result as boolean))
            })
            if (!success) {
                reject(
                    new IllegalArgumentError(
                        "Failed to send the form, because the argument passed is not a valid Player object.",
                        {
                            causedBy: player
                        }
                    )
                )
            }
        })
        promise
            .then((result) => {
                switch (result) {
                    case true:
                        this.#upperButton.callback?.(player)
                        break
                    case false:
                        this.#lowerButton.callback?.(player)
                        break
                    default:
                        break
                }
            })
            .catch((_) => {})
        this.#resultList.set(player.uuid, promise)
    }

    /**
     * set the upper button of the form.
     * - 设置表单的上方按钮。
     * @param text the text of the button.
     *        - 按钮的文本。
     * @param callback the function called when the button clicked.
     *        - 当按钮被点击时调用的函数。
     * @returns `this`
     */
    setUpperButton(text: string, callback?: (player: Player) => void): this {
        this.#upperButton = {
            text,
            callback
        }
        return this
    }

    /**
     * set the lower button of the form.
     * - 设置表单的下方按钮。
     * @param text the text of the button.
     *        - 按钮的文本。
     * @param callback the function called when the button clicked.
     *        - 当按钮被点击时调用的函数。
     * @returns `this`
     */
    setLowerButton(text: string, callback?: (player: Player) => void): this {
        this.#lowerButton = {
            text,
            callback
        }
        return this
    }
}

export class SimpleFormEx extends FormEx<number> {
    constructor(title: string, content: string = "") {
        super(title)
        this.#form = Form.newSimpleForm(title, content)
    }

    #form: SimpleForm

    #resultList: Map<string, Promise<number>> = new Map()

    #cancelCallbacks: ((
        player: Player,
        reason: FormEnum.ModalFormCancelReason
    ) => void)[] = []

    setContent(content: string): this {
        this.#form.setContent(content)
        return this
    }

    /**
     * adds a button to the form.
     *    - 添加按钮
     *
     * @param text the text of the button.
     *        - 按钮的文本
     * @param image the image of the button.
     *        - 按钮的图片
     * @param callback the function called when the button clicked.
     *        - 点击按钮时调用的函数
     * @returns `this`
     */
    addButton(
        text: string,
        image?: SimpleFormImage,
        callback?: (player: Player) => void
    ): this {
        if (image) {
            if (callback) {
                this.#form.appendButton(text, image.type, image.data, callback)
                return this
            }
            this.#form.appendButton(text, image.type, image.data, (_) => {})
            return this
        }
        if (callback) {
            this.#form.appendButton(text, callback)
            return this
        }
        this.#form.appendButton(text)
        return this
    }

    /**
     * adds a button to the form if the condition is true.
     *    - 添加按钮
     *
     * @param condition the condition.
     *        - 条件
     * @param text the text of the button.
     *        - 按钮的文本
     * @param image the image of the button.
     *        - 按钮的图片
     * @param callback the function called when the button clicked.
     *        - 点击按钮时调用的函数
     * @returns `this`
     */
    addButtonIf(
        condition: boolean,
        text: string,
        image?: SimpleFormImage,
        callback?: (player: Player) => void
    ): this {
        if (condition) this.addButton(text, image, callback)
        return this
    }

    /**
     * adds buttons to the form if the condition is true.
     *    - 添加多个按钮
     *
     * @param condition the condition.
     *        - 条件
     * @param buttons the buttons.
     *        - 按钮
     * @returns `this`
     */
    addButtonsIf(
        condition: boolean,
        ...buttons: {
            text: string
            image?: SimpleFormImage
            callback?: (player: Player) => void
        }[]
    ): this {
        if (condition) {
            for (const button of buttons) {
                this.addButton(button.text, button.image, button.callback)
            }
        }
        return this
    }
    override send(player: Player): void {
        if (!(player instanceof Player)) {
            throw new IllegalArgumentError(
                "SimpleFormEx.send expects a player instance as an argument, but got something else.",
                {
                    causedBy: player
                }
            )
        }
        const promise = new Promise<number>((resolve, reject) => {
            const success = this.#form.sendTo(player, (_player, id, reason) => {
                if (reason) {
                    // Cancelled
                    reject(reason as FormEnum.ModalFormCancelReason)
                    for (const callback of this.#cancelCallbacks) {
                        callback(_player, reason)
                    }
                    return
                }
                if (id) {
                    resolve(id)
                }
            })
            if (!success) {
                reject(new Error("Failed to send form to player."))
            }
        })
        promise.then((_) => {}).catch((_) => {})
        this.#resultList.set(player.uuid, promise)
    }

    /**
     * adds a cancel callback to the form.
     *    - 添加取消回调
     *
     * @param callback the function called when the form is cancelled.
     *        - 取消表单时调用的函数
     * @returns `this`
     */
    onCancel(
        callback: (
            player: Player,
            reason: FormEnum.ModalFormCancelReason
        ) => void
    ): this {
        this.#cancelCallbacks.push(callback)
        return this
    }

    override async getResult(player: Player): Promise<number> {
        if (!this.#resultList.has(player.uuid)) {
            throw new UnsentFormError(
                `The simple form '${this.title}' has not been sent to the player: ${player.realName}`
            )
        }
        return this.#resultList.get(player.uuid)!
    }
}

export class CustomFormEx extends FormEx<
    CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]
> {
    constructor(title: string) {
        super(title)
        this.#form = Form.newCustomForm(title)
    }

    #form: CustomForm

    /**
     * the result list of the form.
     * - 表单的结果列表。
     * @private
     * @type {Map<string, Promise<CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]>>}
     * 键为玩家的 uuid，值为玩家相应的 Promise.
     */
    #resultList: Map<
        string,
        Promise<
            CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]
        >
    > = new Map()

    #responseCallbacks: ((
        player: Player,
        success: boolean,
        reason?: FormEnum.ModalFormCancelReason
    ) => void)[] = []

    #components: CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[] =
        []

    /**
     * gets the key of a component.
     * - 获取组件的键。
     * @description
     * The key is used to identify the component.
     * - 键用于标识组件。
     */
    #getComponentKey(
        component: CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>,
        index?: number
    ): string {
        return `${component.type}-${index ?? this.#components.length}`
    }

    #getResultWrapper<T>(index: number): ResultWrapper<T> {
        return {
            by: async (player: Player) => {
                const result = await this.getResult(player)
                return result[index].result as T
            }
        }
    }

    override send(player: Player): void {
        if (!(player instanceof Player)) {
            throw new IllegalArgumentError(
                "CustomFormEx.send expects a player instance as an argument, but got something else.",
                {
                    causedBy: player
                }
            )
        }
        const promise = new Promise<
            CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]
        >(async (resolve, reject) => {
            await delay(0)
            let success = this.#form.sendTo(player, (_player, result) => {
                if (Number.isInteger(result)) {
                    // Cancelled
                    reject(result)
                    for (const callback of this.#responseCallbacks) {
                        callback(
                            _player,
                            false,
                            result as FormEnum.ModalFormCancelReason
                        )
                    }
                    return
                }

                const values: CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[] =
                    []
                for (const [index, value] of this.#components.entries()) {
                    const key = this.#getComponentKey(value, index)
                    values[index] = {
                        ...value,
                        result: (result as Record<string, any>)[key]
                    }
                }
                resolve(values)
                for (const callback of this.#responseCallbacks) {
                    callback(_player, true)
                }
            })
            if (!success) {
                reject(
                    new IllegalArgumentError(
                        "Failed to send form, because the argument passed is not a valid player."
                    )
                )
            }
        })
        promise.then((_) => {}).catch((_) => {})
        this.#resultList.set(
            player.uuid,
            promise as Promise<
                CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]
            >
        )
    }

    override async getResult(
        player: Player
    ): Promise<
        CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]
    > {
        if (!this.#resultList.has(player.uuid)) {
            throw new UnsentFormError(
                `The custom form '${this.title}' has not been sent to the player: ${player.realName}`
            )
        }
        return this.#resultList.get(player.uuid)!
    }

    /**
     * adds a label to the form.
     * - 添加标签到表单。
     * @param text - The text of the label.
     * - 标签的文本。
     * @returns `this` The form itself
     */
    addLabel<Text extends string>(text: Text): this {
        const label: CustomFormComponent.Label & { text: Text } = {
            type: "label",
            text,
            result: undefined
        }
        this.#components.push(label)
        this.#form.appendLabel(text)
        return this
    }

    /**
     * adds an input to the form.
     * - 添加输入框到表单。
     * @param text - The text of the input.
     * - 输入框的文本。
     * @param placeholder - The placeholder of the input.
     * - 输入框的占位符。
     * @param defaultVal - The default value of the input.
     * - 输入框的默认值。
     * @returns `this` The form itself
     */
    addInput(text: string, placeholder?: string, defaultVal?: string): this {
        const input: CustomFormComponent.Input = {
            type: "input",
            text,
            placeholder,
            defaultVal
        }
        this.#components.push(input)
        this.#form.appendInput(
            this.#getComponentKey(input),
            text,
            placeholder,
            defaultVal
        )
        return this
    }

    /**
     * adds a toggle to the form.
     * - 添加开关到表单。
     * @param text - The text of the toggle.
     * - 开关的文本。
     * @param defaultVal - The default value of the toggle.
     * - 开关的默认值。
     */
    addToggle(text: string, defaultVal?: boolean): this {
        const toggle: CustomFormComponent.Toggle = {
            type: "toggle",
            text,
            defaultVal
        }
        this.#components.push(toggle)
        this.#form.appendToggle(this.#getComponentKey(toggle), text, defaultVal)
        return this
    }

    /**
     * adds a dropdown to the form.
     * - 添加下拉菜单到表单。
     * @param text - The text of the dropdown.
     * - 下拉菜单的文本。
     * @param options - The options of the dropdown.
     * - 下拉菜单的选项。
     * @param defaultVal - The default value of the dropdown.
     * - 下拉菜单的默认值。
     */
    addDropdown(text: string, options: string[], defaultVal?: number): this {
        const dropdown: CustomFormComponent.Dropdown = {
            type: "dropdown",
            text,
            options,
            defaultVal
        }
        this.#components.push(dropdown)
        this.#form.appendDropdown(
            this.#getComponentKey(dropdown),
            text,
            options,
            defaultVal
        )
        return this
    }

    /**
     * adds a slider to the form.
     * - 添加滑块到表单。
     * @param text - The text of the slider.
     * - 滑块的文本。
     * @param min - The minimum value of the slider.
     * - 滑块的最小值。
     * @param max - The maximum value of the slider.
     * - 滑块的最大值。
     * @param step - The step of the slider.
     * - 滑块的步骤。
     * @param defaultVal - The default value of the slider.
     * - 滑块的默认值。
     */
    addSlider(
        text: string,
        min: number,
        max: number,
        step?: number,
        defaultVal?: number
    ): this {
        const slider: CustomFormComponent.Slider = {
            type: "slider",
            text,
            min,
            max,
            step,
            defaultVal
        }
        this.#components.push(slider)
        this.#form.appendSlider(
            this.#getComponentKey(slider),
            text,
            min,
            max,
            step,
            defaultVal
        )
        return this
    }

    /**
     * adds a step slider to the form.
     * - 添加步进滑块到表单。
     * @param text - The text of the step slider.
     * - 步进滑块的文本。
     * @param steps - The steps of the step slider.
     * - 步进滑块的步骤。
     * @param defaultVal - The default value of the step slider.
     * - 步进滑块的默认值。
     * @returns `this` The form itself
     */
    addStepSlider(text: string, steps: string[], defaultVal?: number): this {
        const stepSlider: CustomFormComponent.StepSlider = {
            type: "stepSlider",
            text,
            steps,
            defaultVal
        }
        this.#components.push(stepSlider)
        this.#form.appendStepSlider(
            this.#getComponentKey(stepSlider),
            text,
            steps,
            defaultVal
        )
        return this
    }

    /**
     * describe the content of the form.
     * - 描述表单的内容。
     * @param block - A function that takes a `CustomFormDescription` and returns a `void` so that you can describe the form.
     * - 一个接受 `CustomFormDescription` 的函数，返回一个 `Promise<void>`，以便你可以描述表单。
     * @returns `this` The form itself
     * @example
     * ```ts
     * form.describe((desc) => {
     *     desc.label("Label")
     *     const input = desc.input("Input", "Placeholder")
     *     const toggle = desc.toggle("Toggle")
     *     onResponse(async (player) => {
     *         console.log("input: " + await input.by(player) + " toggle: " + await toggle.by(player))
     *     })
     * })
     * ```
     * 受限于 JS 的异步处理机制，
     * 以及尽量不对引擎进行侵入性操作的原则，
     * 你需要在 `onResponse` 中使用 `await` 来获取结果。
     *
     * Considering the limitations of JS's asynchronous processing mechanism,
     * and the principle of not intruding into the engine,
     * you need to avoid the need to use `await` in `onResponse`.
     */
    describe(block: (description: CustomFormDescription) => void): this {
        const desc: CustomFormDescription = {
            label: (text: string) => {
                this.addLabel(text)
                const index = this.#components.length - 1
                return this.#getResultWrapper<
                    CustomFormComponent.Label["result"]
                >(index)
            },
            input: (
                text: string,
                placeholder?: string,
                defaultVal?: string
            ) => {
                this.addInput(text, placeholder, defaultVal)
                const index = this.#components.length - 1
                return this.#getResultWrapper<
                    CustomFormComponent.Input["result"]
                >(index)
            },
            toggle: (text: string, defaultVal?: boolean) => {
                this.addToggle(text, defaultVal)
                const index = this.#components.length - 1
                return this.#getResultWrapper<
                    CustomFormComponent.Toggle["result"]
                >(index)
            },
            dropdown: (
                text: string,
                options: string[],
                defaultVal?: number
            ) => {
                this.addDropdown(text, options, defaultVal)
                const index = this.#components.length - 1
                return this.#getResultWrapper<
                    CustomFormComponent.Dropdown["result"]
                >(index)
            },
            slider: (
                text: string,
                min: number,
                max: number,
                step?: number,
                defaultVal?: number
            ) => {
                this.addSlider(text, min, max, step, defaultVal)
                const index = this.#components.length - 1
                return this.#getResultWrapper<
                    CustomFormComponent.Slider["result"]
                >(index)
            },
            stepSlider: (
                text: string,
                steps: string[],
                defaultVal?: number
            ) => {
                this.addStepSlider(text, steps, defaultVal)
                const index = this.#components.length - 1
                return this.#getResultWrapper<
                    CustomFormComponent.StepSlider["result"]
                >(index)
            },
            onResponse: (callback) => {
                this.#responseCallbacks.push((player, success, _) => {
                    if (success) {
                        callback(player)
                    }
                })
            },
            onCancel: (callback) => {
                this.#responseCallbacks.push((player, success, reason) => {
                    if (!success) {
                        callback(player, reason!)
                    }
                })
            }
        }
        block(desc)
        return this
    }

    /**
     * describe the content of the form.
     * - 描述表单的内容。
     * @param condition - A boolean value that determines whether to describe the form or not.
     * - 一个布尔值，决定是否描述表单。
     * @param block - A function that takes a `CustomFormDescription` and returns a `void` so that you can describe the form.
     * - 一个接受 `CustomFormDescription` 的函数，以便你可以描述表单。
     * @returns `this` The form itself
     * - 表单本身
     */
    describeIf(
        condition: boolean,
        block: (description: CustomFormDescription) => void
    ): this {
        if (condition) this.describe(block)
        return this
    }

    /**
     * add a response callback to the form.
     * - 添加响应回调到表单。
     * @param callback - A function that takes a `Player` and a `CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]` and returns a `void` so that you can handle the response.
     * - 一个接受 `Player` 和 `CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]` 的函数，以便你可以处理响应.
     * @returns `this` The form itself
     */
    onResponse(
        callback: (
            /**
             * the player who submitted the form.
             * - 提交表单的玩家。
             */
            player: Player,
            /**
             * the result of the form.
             * - 表单的结果。
             */
            result: CustomFormComponent.AbstractComponent<CustomFormComponentResultTypes>[]
        ) => void
    ): this {
        this.#responseCallbacks.push(async (player, success, _) => {
            if (success) callback(player, await this.getResult(player)) // 结果已经准备好，实际上不需要等待
        })
        return this
    }

    /**
     * add a response callback to the form.
     * - 添加取消回调到表单。
     * @param callback - A function that takes a `Player` and a `FormEnum.ModalFormCancelReason` and returns a `void` so that you can handle the cancellation.
     * - 一个接受 `Player` 和 `FormEnum.ModalFormCancelReason` 的函数，以便你可以处理取消。
     * @returns `this` The form itself
     */
    onCancel(
        callback: (
            /**
             * the player who canceled the form.
             * - 取消表单的玩家。
             */
            player: Player,
            /**
             * the reason why the form was canceled.
             * - 表单取消的原因.
             */
            reason: FormEnum.ModalFormCancelReason
        ) => void
    ): this {
        this.#responseCallbacks.push((player, success, reason) => {
            if (!success) callback(player, reason!)
        })
        return this
    }
}
