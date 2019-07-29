export interface IResourceHandler {
    resource_name: string;
    handle(...any: any): any;
}
export interface IClientRequest {
    resource_name: string;
    handle: any[];
}
