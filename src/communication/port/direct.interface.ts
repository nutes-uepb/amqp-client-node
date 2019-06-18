
export interface IDirect{

    pub(exchangeName: string, topicKey: string, message: any ):  Promise<boolean>

    sub(exchangeName: string, queueName: string, routing_key: string,
        callback: (message: any) => void ): Promise<boolean>

}
