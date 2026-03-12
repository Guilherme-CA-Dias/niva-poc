import { useState, useEffect } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSchema } from "@/hooks/useSchema";
import { Record } from "@/types/record";
import { Loader2 } from "lucide-react";
import { DataInput } from "@integration-app/react";
import { sendToWebhook } from "@/lib/webhook-utils";
import { ensureAuth } from "@/lib/auth";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { RECORD_ACTIONS } from "@/lib/constants";

interface EditRecordModalProps {
	record: Record;
	isOpen: boolean;
	onClose: () => void;
	onComplete: () => void;
}

interface FieldChange {
	fieldName: string;
	oldValue: any;
	newValue: any;
	timestamp: string;
}

export function EditRecordModal({
	record,
	isOpen,
	onClose,
	onComplete,
}: EditRecordModalProps) {
	const [formData, setFormData] = useState<Record>({ ...record });
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [fieldChanges, setFieldChanges] = useState<FieldChange[]>([]);
	const [error, setError] = useState<string | null>(null);

	// Get schema for the record type
	const {
		schema,
		isLoading: schemaLoading,
		error: schemaError,
	} = useSchema(record.recordType);

	// Reset form data when record changes
	useEffect(() => {
		setFormData({ ...record });
		setError(null); // Clear any previous errors
	}, [record]);

	const handleFieldChange = (value: unknown) => {
		if (!formData?.fields) return;

		const newFields = value as { [key: string]: any };

		// Compare old and new values to track changes
		Object.entries(newFields).forEach(([fieldName, newValue]) => {
			const oldValue = formData.fields?.[fieldName];
			if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
				setFieldChanges((prev) => [
					...prev,
					{
						fieldName,
						oldValue,
						newValue,
						timestamp: new Date().toISOString(),
					},
				]);
			}
		});

		setFormData({
			...formData,
			fields: newFields,
		});
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (isSubmitting) return; // Prevent double submission

		setIsSubmitting(true);
		setError(null); // Clear any previous errors

		try {
			const auth = await ensureAuth();

			// Prepare webhook payload
			// Use ExternalId from fields if available, otherwise use id
			const recordId = record.fields?.ExternalId || record.id;
			const webhookPayload: any = {
				type: "updated" as const,
				data: {
					...formData,
					id: recordId,
					recordType: record.recordType,
				},
				customerId: auth.customerId,
			};

			// Send webhook
			await sendToWebhook(webhookPayload);

			// Use setTimeout to avoid flushSync issues
			setTimeout(() => {
				onComplete();
				setFieldChanges([]);
				onClose();
			}, 0);
		} catch (error) {
			console.error("Error updating record:", error);
			setError(
				error instanceof Error ? error.message : "Failed to update record"
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	if (schemaError) {
		return (
			<Dialog open={isOpen} onOpenChange={onClose}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Error Loading Form</DialogTitle>
					</DialogHeader>
					<p className="text-red-500">
						{schemaError?.message || "Failed to load. Please try again."}
					</p>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[900px] h-[80vh] bg-white dark:bg-gray-800">
				<DialogHeader className="space-y-1.5">
					<DialogTitle className="text-lg font-semibold">
						Edit Record - ID: {formData?.fields?.ExternalId || formData?.id || 'N/A'}
					</DialogTitle>
				</DialogHeader>
				{schemaLoading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : (
					<ScrollArea className="h-[calc(80vh-8rem)]">
						<form onSubmit={handleSubmit} className="space-y-4">
							{error && (
								<div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
									<p className="text-red-600 dark:text-red-400 text-sm">
										{error}
									</p>
								</div>
							)}
							{schema && formData && (
								<div className="rounded-xl bg-sky-100/60 dark:bg-sky-900/20 p-4 shadow-sm [&_input]:bg-white [&_input]:dark:bg-gray-800 [&_input]:dark:text-gray-100 [&_input]:dark:border-gray-700 [&_textarea]:bg-white [&_textarea]:dark:bg-gray-800 [&_textarea]:dark:text-gray-100 [&_textarea]:dark:border-gray-700 [&_select]:bg-white [&_select]:dark:bg-gray-800 [&_select]:dark:text-gray-100 [&_select]:dark:border-gray-700">
									<DataInput
										schema={schema}
										value={formData.fields || {}}
										onChange={handleFieldChange}
									/>
								</div>
							)}
							<DialogFooter className="gap-2 sm:gap-0">
								<Button
									type="button"
									variant="outline"
									className="bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-100 hover:text-red-700 dark:hover:bg-red-700 dark:hover:text-red-100"
									onClick={onClose}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									className="bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100 hover:bg-blue-200 hover:text-blue-800 dark:hover:bg-blue-800 dark:hover:text-blue-100"
									disabled={isSubmitting || schemaLoading}
								>
									{isSubmitting ? (
										<>
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											Saving...
										</>
									) : (
										"Save Changes"
									)}
								</Button>
							</DialogFooter>
						</form>
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
}
