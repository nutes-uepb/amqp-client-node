
export interface IFanout{

    pub(eventName: string, exchangeName: string, message: any): Promise<boolean>

    sub(eventName: string, exchangeName: string, callback: (message: any) => void): Promise<boolean>

}
