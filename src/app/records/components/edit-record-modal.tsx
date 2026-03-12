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
import { DataInput, DropdownPortalBoundary } from "@integration-app/react";
import { sendToWebhook } from "@/lib/webhook-utils";
import { ensureAuth } from "@/lib/auth";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditRecordModalProps {
	record: Record;
	isOpen: boolean;
	onClose: () => void;
	onComplete: () => void;
}

export function EditRecordModal({
	record,
	isOpen,
	onClose,
	onComplete,
}: EditRecordModalProps) {
	const [formData, setFormData] = useState<Record>({ ...record });
	const [isSubmitting, setIsSubmitting] = useState(false);
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

		const newFields = value as Record["fields"];

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
			const webhookPayload = {
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
			<DialogContent className="integration-app-dialog flex h-[80vh] w-[calc(100vw-2rem)] max-w-[900px] flex-col overflow-hidden bg-background p-0 text-foreground">
				<DialogHeader className="space-y-1.5 border-b border-slate-200 px-6 py-5 dark:border-slate-800">
					<DialogTitle className="pr-8 text-lg font-semibold">
						Edit Record - ID: {formData?.fields?.ExternalId || formData?.id || "N/A"}
					</DialogTitle>
				</DialogHeader>
				{schemaLoading ? (
					<div className="flex flex-1 items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin" />
					</div>
				) : (
					<DropdownPortalBoundary>
						<form
							onSubmit={handleSubmit}
							className="relative flex min-h-0 flex-1 flex-col overflow-visible"
						>
							<ScrollArea className="min-h-0 flex-1">
								<div className="space-y-4 px-6 py-5">
									{error && (
										<div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
											<p className="text-sm text-red-600 dark:text-red-400">
												{error}
											</p>
										</div>
									)}
									{schema && formData && (
										<>
											<style dangerouslySetInnerHTML={{__html: `
												.dark .integration-app-dialog input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]),
												.dark .integration-app-dialog textarea,
												.dark .integration-app-dialog select,
												.dark .integration-app-dialog .iap-input__input,
												.dark .integration-app-dialog .iap-textarea__textarea,
												.dark .integration-app-dialog .iap-select__trigger,
												.dark .integration-app-dialog .iap-numberInput__input {
													background-color: rgb(31, 41, 55) !important;
													background: rgb(31, 41, 55) !important;
													color: rgb(243, 244, 246) !important;
													border-color: rgb(75, 85, 99) !important;
												}
												.dark .integration-app-dialog input::placeholder,
												.dark .integration-app-dialog textarea::placeholder {
													color: rgb(156, 163, 175) !important;
												}
												.dark .integration-app-dialog .iap-field__label,
												.dark .integration-app-dialog .iap-field__label *,
												.dark .integration-app-dialog label,
												.dark .integration-app-dialog label *,
												.dark .integration-app-dialog [class*="label"],
												.dark .integration-app-dialog [class*="label"] *,
												.dark .integration-app-dialog [class*="Label"],
												.dark .integration-app-dialog [class*="Label"] *,
												.dark .integration-app-dialog [class*="field"] *:not(input):not(textarea):not(select):not(button),
												.dark .integration-app-dialog [class*="Field"] *:not(input):not(textarea):not(select):not(button) {
													color: rgb(243, 244, 246) !important;
												}
											`}} />
											<div className="data-input-wrapper rounded-xl border border-slate-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/90">
												<style dangerouslySetInnerHTML={{__html: `
													.dark .data-input-wrapper *:not(input):not(textarea):not(select):not(button):not([class*="input"]):not([class*="textarea"]):not([class*="select"]) {
														color: rgb(243, 244, 246) !important;
													}
													.dark .data-input-wrapper [class*="styles-module_cell"],
													.dark .data-input-wrapper [class*="styles-module_cell"] *,
													.dark .data-input-wrapper [class*="styles-module_cellName"],
													.dark .data-input-wrapper [class*="styles-module_cellName"] *,
													.dark .data-input-wrapper [class*="styles-module_title"],
													.dark .data-input-wrapper [class*="styles-module_title"] *,
													.dark .data-input-wrapper [class*="styles-module_title_title"],
													.dark .data-input-wrapper [class*="styles-module_title_title"] *,
													.dark .data-input-wrapper [class*="styles-module_title_leftSide"],
													.dark .data-input-wrapper [class*="styles-module_title_leftSide"] *,
													.dark .data-input-wrapper [class*="styles-module_title_rightSide"],
													.dark .data-input-wrapper [class*="styles-module_title_rightSide"] * {
														color: rgb(243, 244, 246) !important;
														background-color: transparent !important;
														background: transparent !important;
													}
													.dark .data-input-wrapper [class*="styles-module_title"] div,
													.dark .data-input-wrapper [class*="styles-module_title"] span {
														color: rgb(243, 244, 246) !important;
													}
												`}} />
												<DataInput
													schema={schema}
													value={formData.fields || {}}
													onChange={handleFieldChange}
												/>
											</div>
										</>
									)}
								</div>
							</ScrollArea>
							<DialogFooter className="gap-2 border-t border-slate-200 px-6 py-4 sm:gap-2 dark:border-slate-800">
								<Button
									type="button"
									variant="outline"
									className="bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-700 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-red-700 dark:hover:text-red-100"
									onClick={onClose}
									disabled={isSubmitting}
								>
									Cancel
								</Button>
								<Button
									type="submit"
									className="bg-blue-100 text-blue-700 hover:bg-blue-200 hover:text-blue-800 dark:bg-blue-700 dark:text-blue-100 dark:hover:bg-blue-800 dark:hover:text-blue-100"
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
					</DropdownPortalBoundary>
				)}
			</DialogContent>
		</Dialog>
	);
}
