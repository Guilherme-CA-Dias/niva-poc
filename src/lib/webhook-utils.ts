interface WebhookPayloadData {
	id: string;
	recordType?: string;
	name?: string;
	websiteUrl?: string;
	phones?: Array<{
		value: string;
		type: string;
	}>;
	primaryPhone?: string;
	description?: string;
	currency?: string;
	industry?: string;
	ownerId?: string;
	primaryAddress?: {
		type?: string;
		full?: string;
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		zip?: string;
	};
	addresses?: Array<{
		type?: string;
		full?: string;
		street?: string;
		city?: string;
		state?: string;
		country?: string;
		zip?: string;
	}>;
	numberOfEmployees?: number;
	createdTime?: string;
	createdBy?: string;
	updatedTime?: string;
	updatedBy?: string;
	lastActivityTime?: string;
}

interface WebhookPayload {
	type: "created" | "updated" | "deleted";
	data: WebhookPayloadData;
	customerId: string;
	internalContactId?: string;
	externalContactId?: string;
}

// Define webhook URLs for default record types
const WEBHOOK_URLS = {
	files:
		"https://api.integration.app/webhooks/app-events/5cce9363-f191-489c-a738-a8e196be0b3e",
	folders:
		"https://api.integration.app/webhooks/app-events/cd9f4430-8f4e-45a4-badd-9d4666078540",
};

export async function sendToWebhook(payload: WebhookPayload) {
	try {
		// Get the record type from the payload
		const recordType = payload.data?.recordType || "";

		// Get the form type (remove 'get-' prefix for webhook URL lookup)
		const formType = recordType.replace("get-", "");

		console.log(
			`Webhook routing - recordType: ${recordType}, formType: ${formType}`
		);

		// Select the appropriate webhook URL
		const webhookUrl = WEBHOOK_URLS[formType as keyof typeof WEBHOOK_URLS];

		if (!webhookUrl) {
			throw new Error(
				`No webhook URL configured for record type: ${recordType}`
			);
		}

		console.log(`Selected webhook URL: ${webhookUrl}`);

		// Use the payload as-is (no instanceKey needed)
		const finalPayload = { ...payload };

		// Send the webhook
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(finalPayload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Webhook failed (${response.status}):`, errorText);
			throw new Error(
				`Webhook failed: ${response.status} ${response.statusText}`
			);
		}

		// Try to parse JSON response
		const contentType = response.headers.get("content-type");
		if (contentType && contentType.includes("application/json")) {
			return await response.json();
		} else {
			// If not JSON, return the text response
			return await response.text();
		}
	} catch (error) {
		console.error("Error sending webhook:", error);
		throw error;
	}
}
