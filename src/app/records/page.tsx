"use client";

import { RecordsTable } from "./components/records-table";
import { useRecords } from "@/hooks/use-records";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/app/auth-provider";

interface FormDefinition {
	_id: string;
	formId: string;
	formTitle: string;
	type: "default" | "custom";
	integrationKey?: string;
	createdAt: string;
	updatedAt: string;
}

export default function RecordsPage() {
	const [selectedAction, setSelectedAction] = useState<string | "">("");
	const [searchQuery, setSearchQuery] = useState("");
	const [forms, setForms] = useState<FormDefinition[]>([]);
	const [isLoadingForms, setIsLoadingForms] = useState(true);
	const { customerId } = useAuth();

	const {
		records,
		isLoading,
		isError,
		hasMore,
		loadMore,
		importRecords,
		isImporting,
		mutate,
	} = useRecords(selectedAction || null, searchQuery);

	// Fetch forms from MongoDB
	useEffect(() => {
		const fetchForms = async () => {
			if (!customerId) return;

			try {
				setIsLoadingForms(true);
				const response = await fetch(`/api/forms?customerId=${customerId}`);

				if (!response.ok) {
					const errorText = await response.text();
					let errorMessage = "Failed to fetch forms";
					try {
						const errorData = JSON.parse(errorText);
						errorMessage = errorData.error || errorMessage;
					} catch {
						errorMessage = errorText || errorMessage;
					}
					throw new Error(errorMessage);
				}

				const contentType = response.headers.get("content-type");
				if (!contentType || !contentType.includes("application/json")) {
					throw new Error("Response is not JSON");
				}

				const text = await response.text();
				if (!text) {
					throw new Error("Empty response from server");
				}

				const data = JSON.parse(text);

				if (!data.forms) {
					throw new Error("Invalid response format: missing forms array");
				}

				setForms(data.forms);

				// Clear selected action if the form no longer exists
				if (
					selectedAction &&
					!data.forms.find(
						(f: FormDefinition) =>
							`get-${f.formId}` === selectedAction ||
							(f.type === "default" && `get-${f.formId}s` === selectedAction)
					)
				) {
					setSelectedAction("");
				}
			} catch (error) {
				console.error("Error fetching forms:", error);
				setForms([]);
			} finally {
				setIsLoadingForms(false);
			}
		};

		fetchForms();
	}, [customerId, selectedAction]);

	const handleRecordUpdated = () => {
		// Refresh the records list
		mutate();
	};

	const handleRecordDeleted = () => {
		// Refresh the records list
		mutate();
	};

	return (
		<div className="container mx-auto py-10 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-3xl font-bold tracking-tight">Records</h1>
				<p className="text-muted-foreground mt-2">
					Select a record type to view and manage your records
				</p>
			</div>

			{/* Record Type Selection and Search */}
			<div className="grid gap-6 md:grid-cols-[2fr,2fr,auto]">
				<Select
					value={selectedAction}
					onChange={(e) => setSelectedAction(e.target.value)}
					className="w-full"
					disabled={isLoadingForms}
				>
					<option value="">Select record type</option>
					{forms.map((form) => {
						// Use the standard action keys (get-files, get-folders, etc.)
						const actionKey = `get-${form.formId}`;

						return (
							<option key={form.formId} value={actionKey}>
								{form.formTitle} {form.type === "custom" ? "(Custom)" : ""}
							</option>
						);
					})}
				</Select>

				<div className="relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
					<Input
						placeholder="Search records..."
						className="pl-10"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
				</div>

				<Button
					onClick={() => importRecords()}
					disabled={!selectedAction || isImporting}
				>
					{isImporting ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Importing...
						</>
					) : (
						<>
							<RefreshCw className="mr-2 h-4 w-4" />
							Import Records
						</>
					)}
				</Button>
			</div>

			{/* Records Table */}
			<div className="mt-6">
				<RecordsTable
					records={records}
					isLoading={isLoading}
					isError={isError}
					hasMore={hasMore}
					onLoadMore={loadMore}
					onRecordUpdated={handleRecordUpdated}
					onRecordDeleted={handleRecordDeleted}
				/>
			</div>
		</div>
	);
}
