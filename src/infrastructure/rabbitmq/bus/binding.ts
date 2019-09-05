// The MIT License (MIT)
//
// Copyright (c) 2015 abreits
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
//     The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
//     THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
//     FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
//     OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Queue } from './queue'
import { Exchange } from './exchange'
import { IBinding } from '../../port/bus/binding.interface'

export class Binding implements IBinding {
    private _initialized: Promise<Binding>

    private readonly _source: Exchange
    private readonly _destination: Exchange | Queue
    private readonly _pattern: string
    private readonly _args: any

    constructor(destination: Exchange | Queue, source: Exchange, pattern = '', args: any = {}) {
        this._source = source
        this._destination = destination
        this._pattern = pattern
        this._args = args
        this._destination.connection.bindings[Binding.id(this._destination, this._source, this._pattern)] = this
        this.initialize()
    }

    get initialized(): Promise<IBinding> {
        return this._initialized
    }

    get source(): Exchange {
        return this._source
    }

    get destination(): Exchange | Queue {
        return this._destination
    }

    public initialize(): void {
        this._initialized = new Promise<Binding>((resolve, reject) => {
            if (this._destination instanceof Queue) {
                const queue = this._destination as Queue
                queue.initialized.then(() => {
                    queue.channel.bindQueue(this._destination.name,
                        this._source.name, this._pattern, this._args, (err, ok) => {
                            if (err) {
                                // Failed to create queue binding.
                                delete this._destination.connection
                                    .bindings[Binding.id(this._destination, this._source, this._pattern)]
                                reject(err)
                            } else {
                                resolve(this)
                            }
                        })
                })
            } else {
                const exchange = this._destination as Exchange
                exchange.initialized.then(() => {
                    exchange.channel.bindExchange(this._destination.name,
                        this._source.name, this._pattern, this._args, (err, ok) => {
                            if (err) {
                                // Failed to create exchange binding.
                                delete this._destination.connection
                                    .bindings[Binding.id(this._destination, this._source, this._pattern)]
                                reject(err)
                            } else {
                                resolve(this)
                            }
                        })
                })
            }
        })
    }

    public delete(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this._destination instanceof Queue) {
                const queue = this._destination as Queue
                queue.initialized.then(() => {
                    queue.channel.unbindQueue(this._destination.name,
                        this._source.name, this._pattern, this._args, (err, ok) => {
                            if (err) {
                                reject(err)
                            } else {
                                delete this._destination.connection
                                    .bindings[Binding.id(this._destination, this._source, this._pattern)]
                                resolve(null)
                            }
                        })
                })
            } else {
                const exchange = this._destination as Exchange
                exchange.initialized.then(() => {
                    exchange.channel.unbindExchange(this._destination.name,
                        this._source.name, this._pattern, this._args, (err, ok) => {
                            if (err) {
                                reject(err)
                            } else {
                                delete this._destination.connection
                                    .bindings[Binding.id(this._destination, this._source, this._pattern)]
                                resolve(null)
                            }
                        })
                })
            }
        })
    }

    public static id(destination: Exchange | Queue, source: Exchange, pattern?: string): string {
        pattern = pattern || ''
        return '[' + source.name + ']to' + (destination instanceof Queue ? 'Queue' : 'Exchange')
            + '[' + destination.name + ']' + pattern
    }

    public static removeBindingsContaining(connectionPoint: Exchange | Queue): Promise<any> {
        const connection = connectionPoint.connection
        const promises: Promise<void>[] = []
        for (const bindingId of Object.keys(connection.bindings)) {

            const binding: Binding = connection.bindings[bindingId]
            if (binding._source === connectionPoint || binding._destination === connectionPoint) {
                promises.push(binding.delete())
            }
        }
        return Promise.all(promises)
    }
}
