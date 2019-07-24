import { IResourceHandler } from '../../../infrastructure/port/rpc/resource.handler.interface'
import { IServerRegister } from '../../../infrastructure/port/rpc/server.register.interface'

export class RegisterResource {

    private queueName: string
    private connection: IServerRegister

    constructor(connection: IServerRegister, queueName: string) {
        this.connection = connection
        this.queueName = queueName
    }

    public async addResource(resourceName: string, resource: (...any: any) => any): Promise<boolean> {

        const resourceHandler: IResourceHandler = {
            resourceName,
            handle: resource
        }

        try {
            const result = await this.connection.registerResource(this.queueName, resourceHandler)
            return Promise.resolve(result)
        } catch (e) {
            return Promise.reject(e)
        }
    }

    public async removeResource(resourceName: string): Promise<boolean> {

        try {
            const result = await this.connection.unregisterResource(this.queueName, resourceName)
            return Promise.resolve(result)
        } catch (e) {
            return Promise.reject(e)
        }
    }

    public getAllResource(): object {

        const resources = this.connection.getResource()

        if (resources)
            return resources
        else
            return {}
    }

}
