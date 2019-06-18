export interface IEventHandler<T> {
    eventName?: string
    handle(event: T): void
}
