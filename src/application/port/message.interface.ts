export interface IMessage {
    content: any
    fields: IMessageField
    properties: IMessageProperty
}

export interface IMessageProperty {
    priority?: number
    expiration?: string
    message_id?: string
    timestamp?: number
    user_id?: string
    app_id?: string
    cluster_id?: string
    cc?: string | string[]
    bcc?: string | string[]
}

export interface IMessageField {
    consumer_tag?: string
    delivery_tag?: string
    redelivered?: boolean
    exchange?: string
    routing_key?: string
}
