import type Jstz from "@jstz-dev/jstz-client"

// Extension events
enum SignerRequestEventTypes {
  CHECK_STATUS = "JSTZ_CHECK_EXTENSION_AVAILABILITY_REQUEST_TO_EXTENSION",
  SIGN = "JSTZ_SIGN_REQUEST_TO_EXTENSION",
  GET_ADDRESS = "JSTZ_GET_ADDRESS_REQUEST_TO_EXTENSION",
}

enum SignerResponseEventTypes {
  CHECK_STATUS_RESPONSE = "JSTZ_CHECK_EXTENSION_AVAILABILITY_RESPONSE_FROM_EXTENSION",
  SIGN_RESPONSE = "JSTZ_SIGN_RESPONSE_FROM_EXTENSION",
  GET_ADDRESS_RESPONSE = "JSTZ_GET_ADDRESS_RESPONSE_FROM_EXTENSION",
}

interface ExtensionError {
  type: SignerResponseEventTypes
  error: string
}

// Signer requests
interface SignRequestCall {
  type: SignerRequestEventTypes.SIGN
  content: unknown
}

interface CheckStatusCall {
  type: SignerRequestEventTypes.CHECK_STATUS
}

interface GetSignerAddressCall {
  type: SignerRequestEventTypes.GET_ADDRESS
}

// Extension responses
interface ExtensionResponse<T = unknown> {
  type: SignerResponseEventTypes
  data: T
}

interface SignResponse {
  operation: Jstz.Operation
  signature: string
  publicKey: string
  accountAddress: string
}

interface GetAddressResponse {
  accountAddress: string
}

interface CheckStatusResponse {
  success: boolean
}

/**
 * An event dispatcher for Signer extensions
 */
export class JstzSigner {
  eventTarget: EventTarget
  constructor(eventTarget: EventTarget) {
    this.eventTarget = eventTarget
  }

  private getResponseType(reqType: SignerRequestEventTypes) {
    switch (reqType) {
      case SignerRequestEventTypes.SIGN:
        return SignerResponseEventTypes.SIGN_RESPONSE
      case SignerRequestEventTypes.GET_ADDRESS:
        return SignerResponseEventTypes.GET_ADDRESS_RESPONSE
      case SignerRequestEventTypes.CHECK_STATUS:
        return SignerResponseEventTypes.CHECK_STATUS_RESPONSE
      default:
        throw new Error("Unknown request type")
    }
  }

  /**
   * Dispatch a Signer request event on `this.eventTarget`.
   * Returns a Promise listening for the corresponding `ExtensionResponse` event.
   *
   * Signer extensions (typically, a browser wallet) should listen for the given payloads
   * on `this.eventTarget` and emit an `ExtensionResponse<T>` if succesfully handled or
   * `ExtensionError` if not
   */
  public callSignerExtension<T = SignResponse | GetAddressResponse | CheckStatusResponse>(
    payload: SignRequestCall | GetSignerAddressCall | CheckStatusCall,
    options?: {
      timeout?: number
    },
  ): Promise<ExtensionResponse<T>> {
    const event = new CustomEvent<typeof payload>(payload.type, {
      detail: payload,
    })

    this.eventTarget.dispatchEvent(event)

    const { timeout } = options || {}

    return new Promise<ExtensionResponse<T>>((resolve, reject) => {
      let eventFired = false

      if (timeout) {
        setTimeout(() => {
          if (!eventFired) {
            reject(new Error("Extension is not responding"))
          }
        }, timeout)
      }

      this.eventTarget.addEventListener(
        this.getResponseType(payload.type),
        ((event: CustomEvent<ExtensionError | ExtensionResponse<T>>) => {
          eventFired = true

          console.log("event.detail", event.detail)

          if ("error" in event.detail) {
            reject(new Error(event.detail.error))
          } else {
            resolve(event.detail)
          }
        }) as EventListener,
        { once: true },
      )
    })
  }
}

export {
  SignerResponseEventTypes,
  SignerRequestEventTypes,
  type ExtensionError,
  type SignRequestCall,
  type GetSignerAddressCall,
  type ExtensionResponse,
  type SignResponse,
  type GetAddressResponse,
  type CheckStatusCall,
  type CheckStatusResponse,
}
