export interface IEventHandler<T> {
    handle(event: T): void
}
