export interface IEventHandler<T> {
    handle(err: any, event: T): void;
}
