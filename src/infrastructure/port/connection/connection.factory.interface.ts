export interface IConnectionFactory {
    createConnection(IConfiguration): Promise<any>
}
