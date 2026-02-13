import "server-only";

function getKhaltiSecretKey() {
  return process.env.KHALTI_SECRET_KEY || "";
}

function getBaseUrl() {
  return process.env.KHALTI_ENV === "production"
    ? "https://khalti.com/api/v2"
    : "https://dev.khalti.com/api/v2";
}

export interface KhaltiInitiatePayload {
  return_url: string;
  website_url: string;
  amount: number; // in paisa
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  merchant_booking_id?: string;
  merchant_station_id?: string;
  merchant_port_id?: string;
  merchant_start_time?: string;
  merchant_estimated_duration?: string;
}

export interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  expires_in: number;
}

export interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: "Completed" | "Pending" | "Initiated" | "Refunded" | "Expired" | "User canceled" | "Partially refunded";
  transaction_id: string | null;
  fee: number;
  refunded: boolean;
}

/** Initiate a Khalti e-payment */
export async function khaltiInitiate(
  payload: KhaltiInitiatePayload
): Promise<KhaltiInitiateResponse> {
  const res = await fetch(`${getBaseUrl()}/epayment/initiate/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${getKhaltiSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Khalti initiate failed (${res.status}): ${JSON.stringify(err)}`
    );
  }

  return res.json();
}

/** Verify / lookup a Khalti payment by pidx */
export async function khaltiLookup(
  pidx: string
): Promise<KhaltiLookupResponse> {
  const res = await fetch(`${getBaseUrl()}/epayment/lookup/`, {
    method: "POST",
    headers: {
      Authorization: `Key ${getKhaltiSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      `Khalti lookup failed (${res.status}): ${JSON.stringify(err)}`
    );
  }

  return res.json();
}
