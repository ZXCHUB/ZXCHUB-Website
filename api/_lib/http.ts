export type ApiRequest = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: any;
  headers?: Record<string, string | string[] | undefined>;
};

export type ApiResponse = {
  status: (code: number) => ApiResponse;
  json: (body: any) => void;
  send: (body: string | Buffer) => void;
  setHeader: (name: string, value: string | string[]) => void;
  end: () => void;
};

export function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function getRequestOrigin(req: ApiRequest) {
  const host = getQueryValue(req.headers?.['x-forwarded-host']) || getQueryValue(req.headers?.host);
  const proto = getQueryValue(req.headers?.['x-forwarded-proto']) || 'https';
  return `${proto}://${host}`;
}
