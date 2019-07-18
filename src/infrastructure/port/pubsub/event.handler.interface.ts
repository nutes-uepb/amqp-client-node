export interface IEventHandler<T> {
    handle(err, event: T): void
}
