export interface IResourceHandler {
    handle(...any: any): any
}

export interface IClientRequest {
    resourceName: string,
    handle: any[]
}
