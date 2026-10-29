type HttpPost = (url: string, body: unknown, config: { headers: Record<string, string> }) => Promise<{ data: any }>;

export class CloudRequestError extends Error {
  readonly error = 'WhatsApp Cloud request failed';
  constructor(
    message: string,
    readonly status: number,
    readonly deliveryUnknown: boolean,
  ) {
    super(message);
    this.name = 'CloudRequestError';
  }
}

/** Never retry a POST automatically: a lost response can already be delivered. */
export async function postCloudRequest(post: HttpPost, url: string, body: unknown, headers: Record<string, string>) {
  try {
    const result = await post(url, body, { headers });
    if (!result?.data || typeof result.data !== 'object') {
      throw new CloudRequestError('Meta returned no usable response, delivery is unconfirmed', 502, true);
    }
    if (result.data.error) throw providerError(result.data.error, 502);
    return result.data;
  } catch (error: any) {
    if (error instanceof CloudRequestError) throw error;
    const provider = error?.response?.data?.error;
    if (provider) throw providerError(provider, error.response.status);
    const status = Number(error?.response?.status);
    throw new CloudRequestError(
      'Meta request failed without a delivery confirmation, do not resend automatically',
      status >= 500 && status <= 599 ? status : 502,
      true,
    );
  }
}

export function assertCloudMessageAccepted(response: any): void {
  if (typeof response?.messages?.[0]?.id !== 'string' || !response.messages[0].id) {
    throw new CloudRequestError('Meta did not return a message id, delivery is unconfirmed', 502, true);
  }
}

function providerError(provider: any, status: number): CloudRequestError {
  const detail = typeof provider.message === 'string' ? provider.message : 'Meta rejected the request';
  const code = typeof provider.code === 'number' ? ` (code ${provider.code})` : '';
  return new CloudRequestError(`${detail}${code}`, status >= 400 && status <= 599 ? status : 502, false);
}
