/**
 * wait for the specified time(ms) asynchronously
 * - 异步等待指定时间(ms)
 * @param ms time to wait
 */
export async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}