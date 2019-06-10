export interface IMessage {
    event_name: string,
    timestamp: string
}

export interface IMessageGeneric extends IMessage{
    generic: object
}
