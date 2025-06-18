import Jstz from "@jstz-dev/jstz-client"
import * as JstzSigner from "./jstz-signer.client"

const JSTZ_NODE_ENDPOINT = process.env.NEXT_PUBLIC_JSTZ_NODE_ENDPOINT || "http://localhost:8933"

export async function checkExtensionAvailability() {
  const jstzSigner = new JstzSigner.JstzSigner(window)
  return await jstzSigner.callSignerExtension<JstzSigner.CheckStatusResponse>(
    {
      type: JstzSigner.SignerRequestEventTypes.CHECK_STATUS,
    },
    { timeout: 500 },
  )
}

export async function requestAddress() {
  const jstzSigner = new JstzSigner.JstzSigner(window)

  return await jstzSigner.callSignerExtension<JstzSigner.GetAddressResponse>({
    type: JstzSigner.SignerRequestEventTypes.GET_ADDRESS,
  })
}

export async function callSmartFunction({
  smartFunctionRequest,
  onSignatureReceived,
}: {
  smartFunctionRequest: Jstz.Operation.RunFunction
  onSignatureReceived: (response: { data: JstzSigner.SignResponse }, jstzClient: Jstz) => Promise<void>
}) {
  const jstzSigner = new JstzSigner.JstzSigner(window)
  const request = await jstzSigner.callSignerExtension<JstzSigner.SignResponse>({
    type: JstzSigner.SignerRequestEventTypes.SIGN,
    content: smartFunctionRequest,
  })

  const jstzClient = new Jstz.Jstz({
    baseURL: JSTZ_NODE_ENDPOINT,
    timeout: 6000,
  })
  await onSignatureReceived(request, jstzClient)
}
