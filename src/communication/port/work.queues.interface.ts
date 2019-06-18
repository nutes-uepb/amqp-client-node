
export interface IWorkQueues{

    pub(eventName: string, queueName: string, message: any): Promise<boolean>

    sub(eventName: string, queueName: string, callback: (message: any) => void): Promise<boolean>

}
