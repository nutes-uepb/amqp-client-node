export interface IResourceHandler {
    resourceName: string,
    handle(...any: any): any
}

export interface IClientRequest {
    resourceName: string,
    handle: any[]
}
