import { IResourceHandler } from '../../rabbitmq/port/resource.handler.interface'
import { ServerRegisterRabbitmq } from '../../rabbitmq/connection/client-server/server.register.rabbitmq'

export class RegisterResource {

    queueName: string
    connection: ServerRegisterRabbitmq

    constructor(connection: ServerRegisterRabbitmq, queueName: string){
        this.connection = connection
        this.queueName =  queueName
    }

    public addResource (resourceName: string, resource: (...any: any) => any): Promise<boolean>{
        return new Promise<boolean>(async (resolve, reject) => {

            let resourceHandler: IResourceHandler = {
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

    public removeResource (resourceName: string): Promise<boolean>{
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

    public getAllResource (): object{

        let resources = this.connection.getResource()

        if (resources)
            return resources
        else
            return {}
    }

}
