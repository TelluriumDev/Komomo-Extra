import { ResultWrapper } from "./Result.js"

/**
 * represents the type of button image.
 * - 按钮图片的类型
 */
export enum SimpleFormImageType {
    URL = "url",
    PATH = "path"
}

export type Result<T> = {
    result?: T
}

export type CustomFormComponentResultTypes =
    | boolean
    | string
    | number
    | undefined

export namespace CustomFormComponent {
    export type AbstractComponent<R> = {
        type: string
        text: string
    } & Result<R>
    export type Label = {
        type: "label"
        text: string
    } & AbstractComponent<undefined>
    export type Input = {
        type: "input"
        text: string
        placeholder?: string
        defaultVal?: string
    } & AbstractComponent<string>
    export type Toggle = {
        type: "toggle"
        text: string
        defaultVal?: boolean
    } & AbstractComponent<boolean>
    export type Dropdown = {
        type: "dropdown"
        text: string
        options: string[]
        defaultVal?: number
    } & AbstractComponent<number>
    export type Slider = {
        type: "slider"
        text: string
        min: number
        max: number
        step?: number
        defaultVal?: number
    } & AbstractComponent<number>
    export type StepSlider = {
        type: "stepSlider"
        text: string
        steps: string[]
        defaultVal?: number
    } & AbstractComponent<number>
}

export type ResponseResult = {
    player: Player
    success: boolean
    reason?: FormEnum.ModalFormCancelReason
}

export type CustomFormDescription = {
    label: (text: string) => ResultWrapper<CustomFormComponent.Label["result"]>
    input: (
        text: string,
        placeholder?: string,
        defaultVal?: string
    ) => ResultWrapper<CustomFormComponent.Input["result"]>
    toggle: (
        text: string,
        defaultVal?: boolean
    ) => ResultWrapper<CustomFormComponent.Toggle["result"]>
    dropdown: (
        text: string,
        options: string[],
        defaultVal?: number
    ) => ResultWrapper<CustomFormComponent.Dropdown["result"]>
    slider: (
        text: string,
        min: number,
        max: number,
        step?: number,
        defaultVal?: number
    ) => ResultWrapper<CustomFormComponent.Slider["result"]>
    stepSlider: (
        text: string,
        steps: string[],
        defaultVal?: number
    ) => ResultWrapper<CustomFormComponent.StepSlider["result"]>
    onResponse: (callback: (player: Player) => void) => void
    onCancel: (
        callback: (
            player: Player,
            reason: FormEnum.ModalFormCancelReason
        ) => void
    ) => void
}
