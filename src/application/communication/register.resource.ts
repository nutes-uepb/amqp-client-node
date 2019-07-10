import { IResourceHandler } from '../../infrastructure/port/rpc/resource.handler.interface'
import { IServerRegister } from '../../infrastructure/port/rpc/server.register.interface'

export class RegisterResource {

    private queueName: string
    private connection: IServerRegister

    constructor(connection: IServerRegister, queueName: string) {
        this.connection = connection
        this.queueName = queueName
    }

    public addResource(resourceName: string, resource: (...any: any) => any): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            const resourceHandler: IResourceHandler = {
                resourceName,
                handle: resource
            }

            try {
                this.connection.registerResource(this.queueName,
                    resourceHandler).then(result => {
                    return resolve(result)
                }).catch(err => {
                    return reject(err)
                })
            } catch (e) {
                return resolve(false)
            }
        })
    }

    public removeResource(resourceName: string): Promise<boolean> {
        return new Promise<boolean>(async (resolve, reject) => {

            try {
                this.connection.unregisterResource(this.queueName, resourceName)
                    .then(result => {
                        return resolve(result)
                    }).catch(err => {
                    return reject(err)
                })
            } catch (e) {
                return resolve(false)
            }
        })
    }

    public getAllResource(): object {

        const resources = this.connection.getResource()

        if (resources)
            return resources
        else
            return {}
    }

}
