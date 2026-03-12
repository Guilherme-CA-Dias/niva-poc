/**
 * Service to ensure a valid token-extract connection exists for a customer
 */

interface IntegrationAppClient {
	apiUri?: string;
	token?: string;
}

interface Integration {
	key: string;
	connection?: {
		id: string;
		archivedAt?: string | null;
	};
}

interface CreateConnectionResult {
	success: boolean;
	connectionId?: string;
	message: string;
}

/**
 * Checks if a valid token-extract connection exists for the given integration
 */
export function hasValidTokenExtractConnection(
	integration: Integration | undefined
): boolean {
	if (!integration || integration.key !== "token-extract") {
		return false;
	}

	const existingConnection = integration.connection;
	if (!existingConnection?.id) {
		return false;
	}

	// Check if connection is valid (not archived)
	return !existingConnection.archivedAt;
}

/**
 * Creates a connection for a customer
 * @param integrationAppClient - The Integration.app client instance
 * @param integrationId - The integration ID/key
 * @returns Promise with the connection creation result
 */
export async function createConnection(
	integrationAppClient: IntegrationAppClient,
	integrationId: string
): Promise<CreateConnectionResult> {
	try {
		const apiUri = integrationAppClient.apiUri || "https://api.integration.app";
		const token = integrationAppClient.token;

		if (!token) {
			throw new Error("No token available from integrationApp client");
		}

		const connectionPayload = {
			integrationId: "69669baf2a3daad23cd6ef0d",
			credentials: {
				MembraneToken: token,
			},
		};

		console.log("Creating connection with payload:", connectionPayload);

		const response = await fetch(`${apiUri}/connections`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(connectionPayload),
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorData;
			try {
				errorData = JSON.parse(errorText);
			} catch {
				errorData = { error: errorText };
			}
			throw new Error(
				errorData.error || `Failed to create connection: ${response.statusText}`
			);
		}

		const result = await response.json();
		console.log("Connection created successfully:", result);

		// If this is a token-extract connection, run the retrieve-token flow
		if (integrationId === "token-extract") {
			try {
				const flowUrl = `${apiUri}/flows/retrieve-token/run?layer=connection&integrationKey=token-extract`;
				console.log("Running retrieve-token flow...");

				const flowResponse = await fetch(flowUrl, {
					method: "POST",
					headers: {
						accept: "application/json",
						Authorization: `Bearer ${token}`,
						"content-type": "application/json",
					},
				});

				if (!flowResponse.ok) {
					const errorText = await flowResponse.text();
					console.warn("Failed to run retrieve-token flow:", errorText);
					// Don't fail the connection creation if flow fails
				} else {
					const flowResult = await flowResponse.json();
					console.log("Flow run successfully:", flowResult);
				}
			} catch (flowError) {
				console.error("Error running retrieve-token flow:", flowError);
				// Don't fail the connection creation if flow fails
			}
		}

		return {
			success: true,
			connectionId: result.id,
			message: "Connection created successfully",
		};
	} catch (error) {
		console.error("Error creating connection:", error);
		return {
			success: false,
			message:
				error instanceof Error ? error.message : "Failed to create connection",
		};
	}
}

/**
 * Creates a token-extract connection for a customer
 * @param integrationAppClient - The Integration.app client instance
 * @param integrationKey - The integration key (defaults to "token-extract")
 * @returns Promise with the connection creation result
 */
export async function createTokenExtractConnection(
	integrationAppClient: IntegrationAppClient,
	integrationKey: string = "token-extract"
): Promise<CreateConnectionResult> {
	return createConnection(integrationAppClient, integrationKey);
}

/**
 * Ensures a valid token-extract connection exists for a customer
 * Checks if connection exists and is valid, creates one if needed
 * @param integrationAppClient - The Integration.app client instance
 * @param integration - The token-extract integration object
 * @returns Promise with the connection status
 */
export async function ensureTokenExtractConnection(
	integrationAppClient: IntegrationAppClient,
	integration: Integration | undefined
): Promise<CreateConnectionResult> {
	// Check if integration exists
	// If integration doesn't exist, return success=false but don't treat as error
	// This is an optional feature that may not be available in all workspaces
	if (!integration || integration.key !== "token-extract") {
		return {
			success: false,
			message: "token-extract integration not found (optional feature)",
		};
	}

	// Check if there's already a valid connection
	if (hasValidTokenExtractConnection(integration)) {
		console.log("token-extract connection already exists and is valid");
		return {
			success: true,
			connectionId: integration.connection?.id,
			message: "Connection already exists and is valid",
		};
	}

	// Check if connection exists but is archived
	if (integration.connection?.id && integration.connection.archivedAt) {
		console.log(
			"token-extract connection exists but is archived, will create new one"
		);
	}

	// Create the connection
	return await createTokenExtractConnection(integrationAppClient);
}
