export interface IServerRegister {
    start(): Promise<void>;
    addResource(resourceName: string, resource: (...any: any) => any): boolean;
    removeResource(resourceName: string): boolean;
    getAllResource(): object;
}
