import { ITask, ITaskCallback } from './type'

const macroTask: ITask[] = []
let deadline: number = 0
const sliceLen: number = 5
const callbacks = []

export const schedule = (cb) => callbacks.push(cb) === 1 && postMessage()

export const scheduleWork = (callback: ITaskCallback): void => {
  const currentTime = getTime()
  const newTask = {
    callback,
    time: currentTime + 3000,
  }
  macroTask.push(newTask)
  schedule(flushWork)
}

const postMessage = (() => {
  const cb = () => callbacks.splice(0, callbacks.length).forEach((c) => c())
  if (typeof MessageChannel !== 'undefined') {
    const { port1, port2 } = new MessageChannel()
    port1.onmessage = cb
    return () => port2.postMessage(null)
  }
  return () => setTimeout(cb)
})()

const flush = (initTime: number): boolean => {
  let currentTime = initTime
  let currentTask = peek(macroTask)

  while (currentTask) {
    const timeout = currentTask.time <= currentTime
    if (!timeout && shouldYield()) break

    // currentTask.callback can only be reconciler.ts:reconcileWork() or null
    const reconcileWork = currentTask.callback
    currentTask.callback = null

    if (reconcileWork?.(timeout)) {
      currentTask.callback = reconcileWork
    } else {
      macroTask.shift()
    }

    currentTask = peek(macroTask)
    currentTime = getTime()
  }
  return !!currentTask
}

const peek = (queue: ITask[]) => {
  queue.sort((a, b) => a.time - b.time)
  return queue[0]
}

const flushWork = (): void => {
  const currentTime = getTime()
  deadline = currentTime + sliceLen
  flush(currentTime) && schedule(flushWork)
}

export const shouldYield = (): boolean => {
  return getTime() >= deadline
}

const getTime = () => performance.now()
